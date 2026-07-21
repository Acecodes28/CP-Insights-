import { useEffect, useState } from "react";

// Used to gate scroll-jacking / pin-on-scroll effects (ScrollStack, etc.)
// off on narrow viewports. Those effects rely on precise scroll-position
// math against a fixed-ish viewport height - on a phone that math still
// "works" but the pin/scale motion reads as janky and eats a lot of
// vertical scroll distance for not much payoff, so below this width we
// render the equivalent content as a plain stacked list instead.
export default function useIsNarrowViewport(breakpoint = 720) {
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isNarrow;
}
