import React from 'react';
interface CountryFlagProps {
  country: string;
  size?: 'sm' | 'md' | 'lg';
}
const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  size = 'md'
}) => {
  const flagMap: Record<string, string> = {
    us: 'https://flagcdn.com/w40/us.png',
    uk: 'https://flagcdn.com/w40/gb.png',
    germany: 'https://flagcdn.com/w40/de.png',
    france: 'https://flagcdn.com/w40/fr.png',
    spain: 'https://flagcdn.com/w40/es.png',
    netherlands: 'https://flagcdn.com/w40/nl.png',
    italy: 'https://flagcdn.com/w40/it.png',
    lithuania: 'https://flagcdn.com/w40/lt.png',
    estonia: 'https://flagcdn.com/w40/ee.png',
    latvia: 'https://flagcdn.com/w40/lv.png',
    china: 'https://flagcdn.com/w40/cn.png',
    india: 'https://flagcdn.com/w40/in.png',
    japan: 'https://flagcdn.com/w40/jp.png',
    eu: 'https://flagcdn.com/w40/eu.png'
  };
  const sizeClasses = {
    sm: 'w-4 h-3',
    md: 'w-6 h-4',
    lg: 'w-8 h-6'
  };
  const flagUrl = flagMap[country.toLowerCase()] || flagMap.eu;
  return <img src={flagUrl} alt={`${country} flag`} className={`${sizeClasses[size]} inline-block rounded-sm object-cover`} />;
};
export default CountryFlag;