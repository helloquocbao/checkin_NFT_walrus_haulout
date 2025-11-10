import React, { useState } from "react";
import Recently_added_dropdown from "../dropdown/recently_added_dropdown";
import {
  Accordion,
  AccordionItem,
  AccordionItemHeading,
  AccordionItemButton,
  AccordionItemPanel,
} from "react-accessible-accordion";

const Collection_category_filter = () => {
  return (
    <>
      {/* <!-- Filter --> */}
      <div className="mb-8 flex flex-wrap items-center justify-between">
        {/* <!-- Sort --> */}
        <Recently_added_dropdown data={sortText} dropdownFor="recently_added" />
      </div>
    </>
  );
};

export default Collection_category_filter;
