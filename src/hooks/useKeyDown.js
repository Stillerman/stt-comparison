import { useEffect } from "react";

const useKeyDown = (key, onKeyDown, onKeyUp, dependencies = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === key) {
        event.preventDefault();
        onKeyDown(event);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === key) {
        event.preventDefault();
        onKeyUp(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [key, onKeyDown, onKeyUp, ...dependencies]);
};

export default useKeyDown;
