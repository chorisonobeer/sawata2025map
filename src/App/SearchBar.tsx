import React, { useState, useCallback } from 'react';
import './SearchBar.scss';

type SearchBarProps = {
  onSearch: (query: string) => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  
  // デバウンスされた検索処理
  const debouncedSearch = useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [onSearch]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  return (
    <div className="search-bar-container">
      <input
        type="text"
        className="search-input"
        placeholder="スポットを検索..."
        value={query}
        onChange={handleChange}
        aria-label="検索"
      />
    </div>
  );
};

export default SearchBar;