export default function SectionLoadError({ message }) {
  return (
    <div className="page-center page-center-col">
      <p>Couldn't generate this section.</p>
      <p className="muted small">{message || "Something went wrong. Please try again."}</p>
    </div>
  );
}
