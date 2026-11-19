import { useEffect } from "react";

// Each page names its browser tab, so history and open tabs aren't all "CampusCirculate".
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | CampusCirculate` : "CampusCirculate";
  }, [title]);
}
