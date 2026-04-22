"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon } from "lucide-react";

export function ScrollToBottom() {
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    const distFromBottom =
      document.documentElement.scrollHeight -
      window.scrollY -
      window.innerHeight;
    setVisible(distFromBottom > 400);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  if (!visible) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
      aria-label="Scroll to bottom"
      onClick={() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        })
      }
    >
      <ArrowDownIcon className="h-4 w-4" />
    </Button>
  );
}
