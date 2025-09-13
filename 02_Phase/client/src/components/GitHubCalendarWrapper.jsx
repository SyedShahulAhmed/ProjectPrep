// src/components/GitHubCalendarWrapper.jsx
import React from 'react';
import GitHubCalendar from "react-github-calendar";

const GitHubCalendarWrapper = ({ name }) => {
  const customTheme = {
    dark: ["#e7ecef", "#48cae4", "#00b4d8", "#0096c7", "#0077b6"], // Custom theme colors
  };

  if (!name) {
    return <div className="text-center text-gray-500">No GitHub username provided</div>;
  }

  return (
    <div className="max-w-[1240px] mx-auto mt-8 px-4">
      <div className="md:w-full overflow-x-auto font-bold mx-auto mb-8 flex justify-center items-center">
        <GitHubCalendar
          username={name}   // ✅ now uses the name prop
          blockSize={15}
          blockMargin={5}
          theme={customTheme}
          fontSize={14}
        />
      </div>
    </div>
  );
};

export default GitHubCalendarWrapper;
