export function CornerBrackets() {
  const base = "absolute size-3 border-sky-400/50";
  return (
    <>
      <span className={`${base} top-1.5 left-1.5 border-t-2 border-l-2`} />
      <span className={`${base} top-1.5 right-1.5 border-t-2 border-r-2`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b-2 border-l-2`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b-2 border-r-2`} />
    </>
  );
}
