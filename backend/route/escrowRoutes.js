const express = require("express");
const router = express.Router();
const Escrow = require("../models/Escrow");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/auth");
const asyncHandler = require("express-async-handler");
const ethers = require("ethers"); // Add this import

const cleanEscrowRecords = async (userId) => {
  const invalidEscrows = await Escrow.find({
    productId: null,
    buyerId: userId,
    deletedAt: null,
  });
  if (invalidEscrows.length) {
    await Escrow.updateMany(
      { _id: { $in: invalidEscrows.map((e) => e._id) } },
      { $set: { deletedAt: new Date() } }
    );
    console.log(
      `Soft deleted ${invalidEscrows.length} invalid escrow records for user ${userId}`
    );
  }
};

router.post(
  "/create",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { productId, amount, paymentToken, quantity } = req.body;
    if (!productId || !amount || !paymentToken || !quantity || quantity < 1) {
      res.status(400);
      throw new Error("All fields are required with valid values");
    }

    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    }).populate("owner");
    if (!product) {
      res.status(404);
      throw new Error("Product not found or deleted");
    }
    if (product.owner._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Cannot create escrow for your own product");
    }

    const escrow = new Escrow({
      productId,
      buyerId: req.user._id,
      sellerId: product.owner._id,
      amount,
      paymentToken,
      quantity,
      contractAddress: "0xPendingDeployment",
      status: "pending",
    });
    await escrow.save();

    res.status(201).json({ success: true, data: escrow });
  })
);

router.get(
  "/user",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await cleanEscrowRecords(req.user._id);
    const transactions = await Escrow.find({
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
      deletedAt: null,
    })
      .populate("productId", "name price")
      .populate("sellerId", "walletAddress");
    res.json({ success: true, data: transactions });
  })
);

router.patch(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { contractAddress, status } = req.body;
    const escrow = await Escrow.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!escrow) {
      res.status(404);
      throw new Error("Escrow not found");
    }
    if (escrow.buyerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to update this escrow");
    }

    // Validate status transition
    if (status) {
      if (escrow.status !== "pending") {
        res.status(400);
        throw new Error(
          `Cannot change status from ${escrow.status} to ${status}`
        );
      }
      if (status !== "held") {
        res.status(400);
        throw new Error(
          `Invalid status update: only 'held' is allowed from 'pending'`
        );
      }
      escrow.status = status;
    }

    // Update contractAddress if provided
    if (contractAddress) {
      if (!ethers.utils.isAddress(contractAddress)) {
        res.status(400);
        throw new Error("Invalid contract address");
      }
      escrow.contractAddress = contractAddress;
    }

    await escrow.save();
    res.json({ success: true, data: escrow });
  })
);

router.post(
  "/release/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const escrow = await Escrow.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    const product = await Product.findOne({
      _id: escrow.productId,
      deletedAt: null,
    });

    if (!escrow) {
      res.status(404);
      throw new Error("Escrow not found");
    }
    if (escrow.buyerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the buyer can release funds");
    }
    if (escrow.status !== "held") {
      res.status(400);
      throw new Error(
        `Cannot release funds: escrow status is ${escrow.status}`
      );
    }
    escrow.status = "released";
    await escrow.save();

    await Product.updateOne(
      { _id: product.id },
      { amount: product.amount - escrow.quantity }
    );

    res.json({ success: true, data: escrow });
  })
);

router.post(
  "/refund/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const escrow = await Escrow.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!escrow) {
      res.status(404);
      throw new Error("Escrow not found");
    }
    if (escrow.sellerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the seller can refund funds");
    }
    if (escrow.status !== "held") {
      res.status(400);
      throw new Error(`Cannot refund funds: escrow status is ${escrow.status}`);
    }
    escrow.status = "refunded";
    await escrow.save();
    res.json({ success: true, data: escrow });
  })
);

module.exports = router;
