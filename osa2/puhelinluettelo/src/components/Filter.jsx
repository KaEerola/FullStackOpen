const Filter = ({ filter, setFilter }) => {
    return (
      <div>
        filter shown with:
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="search by name"
        />
      </div>
    )
  }
  
  export default Filter