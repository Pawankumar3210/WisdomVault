import { useEffect, useState } from "react";
import {
  clearRecent,
  readLibrary,
  removeBookmark,
  subscribeLibrary,
  toggleBookmark,
} from "./userLibrary";

export default function useUserLibrary() {
  const [library, setLibrary] = useState(readLibrary);

  useEffect(() => subscribeLibrary(() => setLibrary(readLibrary())), []);

  return {
    ...library,
    toggleBookmark,
    removeBookmark,
    clearRecent,
  };
}
