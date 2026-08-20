export type TechName =
  | "nextjs"
  | "react"
  | "python"
  | "typescript"
  | "javascript"
  | "docker"
  | "firebase"
  | "gcp";

export interface TechLogoProps {
  name: TechName;
  size?: number;
}

/** Simplified brand marks for the about-page tech stack chips. */
export function TechLogo({ name, size = 20 }: TechLogoProps) {
  switch (name) {
    case "nextjs":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <circle cx="12" cy="12" r="11" fill="#000" stroke="#EDEDED" strokeWidth="1.2" />
          <path d="M8.7 7.5V16.5H9.9V9.6L15.4 16.5H16.6V7.5H15.4V14.2L10.1 7.5H8.7Z" fill="#EDEDED" />
        </svg>
      );
    case "react":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <g fill="none" stroke="#61DAFB" strokeWidth="1.2">
            <ellipse cx="12" cy="12" rx="10" ry="4.2" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
          </g>
          <circle cx="12" cy="12" r="1.8" fill="#61DAFB" />
        </svg>
      );
    case "python":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <path
            d="M12 2c-4 0-4 2-4 2v3h4v1H5s-3 0-3 5 3 5 3 5h2v-3s0-2 2-2h4s3 0 3-3V5s0-3-4-3z"
            fill="#3776AB"
          />
          <path
            d="M12 22c4 0 4-2 4-2v-3h-4v-1h7s3 0 3-5-3-5-3-5h-2v3s0 2-2 2h-4s-3 0-3 3v5s0 3 4 3z"
            fill="#FFD43B"
          />
          <circle cx="9" cy="5" r="0.8" fill="#fff" />
          <circle cx="15" cy="19" r="0.8" fill="#fff" />
        </svg>
      );
    case "typescript":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <rect x="1" y="1" width="22" height="22" rx="3" fill="#3178C6" />
          <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
            TS
          </text>
        </svg>
      );
    case "javascript":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <rect x="1" y="1" width="22" height="22" rx="3" fill="#F7DF1E" />
          <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111" fontFamily="Arial, sans-serif">
            JS
          </text>
        </svg>
      );
    case "docker":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className="jk-tech-logo">
          <rect x="2" y="11" width="3.2" height="3.2" />
          <rect x="6" y="11" width="3.2" height="3.2" />
          <rect x="10" y="11" width="3.2" height="3.2" />
          <rect x="6" y="7" width="3.2" height="3.2" />
          <rect x="10" y="7" width="3.2" height="3.2" />
          <rect x="10" y="3" width="3.2" height="3.2" />
          <path d="M1 14.3c0 4.2 3.4 6.7 8.6 6.7 6.3 0 11-2.9 13.2-8.2.9.1 2.7-.2 3.2-1.4-1-.6-2.4-.5-3.1-.4-.1-.6-.4-1.1-.9-1.5l-.4-.3-.3.4c-.4.5-.6 1.3-.5 2-2.9-1.1-16-1.1-19.8-.1-.2.9 0 2.8 0 2.8z" />
        </svg>
      );
    case "firebase":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className="jk-tech-logo">
          <path d="M5 18L8 2l3 5.5L13 4l6 14-7 4-7-4z" fill="#FFA000" />
          <path d="M5 18l7-3 7 3-7 4-7-4z" fill="#FFCA28" />
          <path d="M8 2l3 5.5-2.4 4.4L5 18z" fill="#FF8F00" />
        </svg>
      );
    case "gcp":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="jk-tech-logo">
          <path
            d="M15.5 9.5A5.5 5.5 0 0 0 5 11.6 4 4 0 0 0 5.5 19.5h10a4.5 4.5 0 0 0 0-9 4.9 4.9 0 0 0 0-1z"
            stroke="#4285F4"
            strokeWidth="1.6"
          />
        </svg>
      );
  }
}
