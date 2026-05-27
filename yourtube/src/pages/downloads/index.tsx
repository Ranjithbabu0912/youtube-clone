import DownloadsContent from "@/components/DownloadsContent";
import React, { Suspense } from "react";

const index = () => {
  return (
    <main className="flex-1 p-4 md:p-6 bg-white text-black">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Downloads</h1>
        <Suspense fallback={<div className="text-sm text-gray-500">Loading downloads...</div>}>
          <DownloadsContent />
        </Suspense>
      </div>
    </main>
  );
};

export default index;
