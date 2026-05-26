import { useState, useEffect } from 'react'
import axios from 'axios'

const App = () => {
  const [countries, setCountries] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    axios.get('https://studies.cs.helsinki.fi/restcountries/api/all')
      .then(res => setCountries(res.data))
  }, [])

  const filtered = countries.filter(country =>
    country.name.common.toLowerCase().includes(search.toLowerCase())
  )

  const countryToShow = selected || (filtered.length === 1 ? filtered[0] : null)

  useEffect(() => {
    if (countryToShow) {
      const api_key = import.meta.env.VITE_WEATHER_API_KEY
      axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${countryToShow.capital[0]}&appid=${api_key}&units=metric`)
        .then(res => setWeather(res.data))
    } else {
      setWeather(null)
    }
  }, [countryToShow])

  return (
    <div>
      find countries <br />
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelected(null)
        }}
      />
      {search === ''
        ? null
        : countryToShow
          ? <div>
              <h2>{countryToShow.name.common}</h2>
              <p>capital {countryToShow.capital[0]}</p>
              <p>population {countryToShow.population}</p>
              <h3>languages</h3>
              <ul>
                {Object.values(countryToShow.languages).map(lang =>
                  <li key={lang}>{lang}</li>
                )}
              </ul>
              <img src={countryToShow.flags.png} alt={`flag of ${countryToShow.name.common}`} />
              {weather &&
                <div>
                  <h3>Weather in {countryToShow.capital[0]}</h3>
                  <p>temperature {weather.main.temp} Celsius</p>
                  <img src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt={weather.weather[0].description} />
                  <p>wind {weather.wind.speed} m/s</p>
                </div>
              }
            </div>
          : filtered.length > 10
            ? <p>Too many matches, specify another filter</p>
            : <ul>
                {filtered.map(country =>
                  <li key={country.name.common}>
                    {country.name.common}
                    <button onClick={() => setSelected(country)}>show</button>
                  </li>
                )}
              </ul>
      }
    </div>
  )
}

export default App
