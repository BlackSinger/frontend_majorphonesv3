const MEASUREMENT_ID = 'G-8M931KWSPB';

const readCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

// _ga = GA1.1.<random>.<timestamp>: the client_id is the last two parts
export const readGaClientId = (cookie = readCookie('_ga')) => {
  const match = cookie?.match(/^GA\d\.\d\.(\d{1,20}\.\d{9,11})$/);
  return match ? match[1] : undefined;
};

// _ga_<id> = GS1.1.<session_id>.<n>... (old) or GS2.1.s<session_id>$o<n>$... (new)
export const readGaSessionId = (cookie = readCookie(`_ga_${MEASUREMENT_ID.slice(2)}`)) => {
  const match = cookie?.match(/^GS\d\.\d\.s?(\d{9,11})(?:[.$]|$)/);
  return match ? match[1] : undefined;
};
