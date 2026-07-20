import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HandleSearchBar({ autoFocus = false, placeholder = "Enter a Codeforces handle…" }) {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const handle = value.trim();
    if (!handle) return;
    navigate(`/profile/${handle}`);
  }

  return (
    <form className="handle-search" onSubmit={handleSubmit}>
      <input
        type="text"
        className="handle-search-input mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <button type="submit" className="handle-search-submit">
        Search
      </button>
    </form>
  );
}