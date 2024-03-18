import { useEffect, useState } from 'react';
import { TOTP } from 'totp-generator';
import './App.css';

const authPairs = [
  {
    title: "GitHub",
    secret: "",
    code: 0,
    expiration: 0,
    expirationDisplay: 0
  },
  {
    title: "AWS",
    secret: "",
    code: 0,
    expiration: 0,
    expirationDisplay: 0
  }
];

function App() {
  const [codes, setCodes] = useState([...authPairs]);

  const generate = (pair: any, index: number) => {
    const { otp, expires } = TOTP.generate(pair.secret);
    setCodes(prevCodes => {
      const temp = [...prevCodes];
      temp[index].code = parseInt(otp);
      temp[index].expiration = expires;
      temp[index].expirationDisplay = Math.max((expires - Date.now()) / 1000, 0);
      return temp;
    });
  };

  useEffect(() => {
    const intervals = authPairs.map((pair, index) => {
      if (pair.expiration < Date.now() || pair.code === 0 || pair.expiration === 0) {
        generate(pair, index);
      }
      return setInterval(() => {
        const remainingTime = Math.max((pair.expiration - Date.now()) / 1000, 0);
        if (remainingTime === 0) {
          generate(pair, index);
        } else {
          setCodes(prevCodes => {
            const temp = [...prevCodes];
            temp[index].expirationDisplay = remainingTime;
            return temp;
          });
        }
      }, 1000);
    });
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, []);

  const displayCode = (code: number) => {
    const groups: any = code.toString().match(/\d{1,3}/g);
    return `${groups[0]} ${groups[1]}`;
  };

  const copyCode = (code: number) => {
    try {
      navigator.clipboard.writeText(code.toString());
    } catch (err: any) {
      console.error(err);
    }
  }

  return (
    <div className="mfamanager-main">
      {codes.map((pair, index) => (
        <div key={index} className="mfamanager-card">
          <div className="mfamanager-title">
            {pair.title}
          </div>
          <div className="mfamanager-code" onClick={() => copyCode(pair.code)}>
            {displayCode(pair.code)}
          </div>
          <div className="mfamanager-expiration">
            {pair.expirationDisplay.toFixed(0)} seconds
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
