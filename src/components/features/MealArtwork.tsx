export function MealArtwork({ vegetarian = false }: { vegetarian?: boolean }) {
  return (
    <svg viewBox="0 0 360 230" className="meal-plate h-full w-full" aria-hidden="true">
      <ellipse cx="180" cy="128" rx="126" ry="91" fill="#fffdf5" />
      <ellipse cx="180" cy="128" rx="109" ry="76" fill="#f4ebd6" />
      <ellipse cx="180" cy="128" rx="99" ry="67" fill="#fffaf0" />
      <g
        fill={vegetarian ? '#df6034' : '#c57432'}
        stroke={vegetarian ? '#bd4423' : '#a85527'}
        strokeWidth="3"
      >
        <path d="M119 106 Q133 60 173 85 Q213 80 210 114 Q199 147 169 147 Q126 151 119 106" />
        <path d="M160 111 Q196 94 216 123 Q236 148 203 164 Q162 176 151 144Z" />
      </g>
      <g fill="#edbd4f" stroke="#d89e32" strokeWidth="2">
        <rect x="95" y="126" width="15" height="49" rx="6" transform="rotate(-22 95 126)" />
        <rect x="114" y="133" width="15" height="50" rx="6" transform="rotate(-15 114 133)" />
        <rect x="131" y="144" width="15" height="43" rx="6" transform="rotate(-8 131 144)" />
      </g>
      <g fill="#477946">
        <ellipse cx="241" cy="102" rx="23" ry="12" transform="rotate(-30 241 102)" />
        <ellipse cx="252" cy="126" rx="24" ry="13" transform="rotate(25 252 126)" />
        <ellipse cx="222" cy="91" rx="20" ry="12" transform="rotate(35 222 91)" />
      </g>
      <g fill="#e44b30">
        <circle cx="235" cy="143" r="12" />
        <circle cx="251" cy="157" r="10" />
      </g>
      <g fill="#fff0b7">
        <circle cx="153" cy="106" r="3" />
        <circle cx="179" cy="97" r="3" />
        <circle cx="193" cy="132" r="3" />
      </g>
      <path
        d="M169 116 Q186 109 191 116"
        fill="none"
        stroke="#386b3c"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
