import React from "react";
import { FaLaptop, FaMobileAlt, FaHome, FaTshirt, FaCar } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { Link } from "react-router-dom";

// Define the static categories with names and links
const categories = [
  { name: "Electronics", link: "/electronics" },
  { name: "Smartphones & Tablets", link: "/smartphonestabs" },
  { name: "Home & Garden", link: "/homeandgarden" },
  { name: "Fashion", link: "/fashion" },
  { name: "Vehicles", link: "/vehicles" },
];

// Map category names to icons
const iconMap = {
  Electronics: <FaLaptop />,
  "Smartphones & Tablets": <FaMobileAlt />,
  "Home & Garden": <FaHome />,
  Fashion: <FaTshirt />,
  Vehicles: <FaCar />,
};

const CategorySideBar = () => {
  return (
    <div className="w-64 bg-white shadow-md rounded-lg p-4">
      <ul className="space-y-3">
        {categories.map((category, index) => (
          <li
            key={index}
            className="rounded-lg cursor-pointer hover:bg-gray-100 transition"
          >
            <Link
              to={category.link}
              className="flex items-center justify-between px-4 py-2"
            >
              <div className="flex items-center space-x-3">
                <span className="text-gray-600 text-lg">
                  {iconMap[category.name] || <FaLaptop />}
                </span>
                <span className="text-gray-600 font-medium">{category.name}</span>
              </div>
              <IoIosArrowForward className="text-gray-500" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategorySideBar;