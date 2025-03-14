import { useEffect, useState, useRef } from 'react';
import { TOTP } from 'totp-generator';
import './App.css';

interface AuthPair {
  title: string;
  secret: string;
  code: number;
  expiration: number;
  expirationDisplay: number;
}

function App() {
  const [page, setPage] = useState("main");
  const [codes, setCodes] = useState<AuthPair[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newSecret, setNewSecret] = useState("");

  // Store intervals so they can be cleared when needed
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const generate = (pair: AuthPair, index: number) => {
    const { otp, expires } = TOTP.generate(pair.secret);
    setCodes(prevCodes => {
      const temp = [...prevCodes];
      if (temp[index]) { // Ensure index is valid
        temp[index].code = parseInt(otp);
        temp[index].expiration = expires;
        temp[index].expirationDisplay = Math.max((expires - Date.now()) / 1000, 0);
      }
      return temp;
    });
  };

  const startInterval = (pair: AuthPair, index: number) => {
    // Clear existing interval if any
    if (intervalsRef.current.has(pair.secret)) {
      clearInterval(intervalsRef.current.get(pair.secret)!);
    }

    // Set a new interval
    const interval = setInterval(() => {
      setCodes(prevCodes => {
        const temp = [...prevCodes];
        if (temp[index]) { // Ensure index is valid before updating
          const remainingTime = Math.max((temp[index].expiration - Date.now()) / 1000, 0);
          if (remainingTime === 0) {
            generate(temp[index], index);
          } else {
            temp[index].expirationDisplay = remainingTime;
          }
        }
        return temp;
      });
    }, 1000);

    // Store interval reference
    intervalsRef.current.set(pair.secret, interval);
  };

  const getAuthPairs = async () => {
    try {
      //@ts-ignore
      const storedObject = await browser.storage.local.get('mfamanager');
      const currentPairs: AuthPair[] = storedObject?.mfamanager || [];

      setCodes(currentPairs);
      
      // Clear all old intervals
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current.clear();

      if (currentPairs.length > 0) {
        currentPairs.forEach((pair, index) => {
          if (pair.expiration < Date.now() || pair.code === 0 || pair.expiration === 0) {
            generate(pair, index);
          }
          startInterval(pair, index);
        });
      }
    } catch (err) {
      console.error("Failed to load authentication pairs:", err);
    }
  };

  useEffect(() => {
    getAuthPairs();
    return () => {
      // Cleanup all intervals when component unmounts
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

  const deleteCode = async (secret: string) => {
    try {
      //@ts-ignore
      const storedObject = await browser.storage.local.get('mfamanager');
      const currentPairs: AuthPair[] = storedObject?.mfamanager || [];
  
      const updatedPairs = currentPairs.filter(pair => pair.secret !== secret);
  
      // Clear and remove interval for the deleted pair
      if (intervalsRef.current.has(secret)) {
        clearInterval(intervalsRef.current.get(secret)!);
        intervalsRef.current.delete(secret);
      }

      //@ts-ignore
      await browser.storage.local.set({ mfamanager: updatedPairs });
      setCodes(updatedPairs);
    } catch (err) {
      console.error("Failed to delete authentication pair:", err);
    }
  };

  const saveNewPair = async () => {
    try {
      //@ts-ignore
      const storedObject = await browser.storage.local.get('mfamanager');
      const currentPairs: AuthPair[] = storedObject?.mfamanager || [];

      const { otp, expires } = TOTP.generate(newSecret);
      const newAuthPair: AuthPair = { 
        title: newTitle, 
        secret: newSecret, 
        code: parseInt(otp), 
        expiration: expires, 
        expirationDisplay: Math.max((expires - Date.now()) / 1000, 0) 
      };

      currentPairs.push(newAuthPair);

      //@ts-ignore
      await browser.storage.local.set({ mfamanager: currentPairs });
      await getAuthPairs();
      setNewTitle("");
      setNewSecret("");
      setPage("main");
    } catch (err) {
      console.error("Failed to save new authentication pair:", err);
    }
  };

  const displayCode = (code: number) => {
    const groups = code.toString().match(/\d{1,3}/g);
    return groups ? `${groups[0]} ${groups[1]}` : "Invalid code";
  };

  return (
    <div className="mfamanager-main">
      {page === "new" ? (
        <div className="mfamanager-card">
          <div className="link" onClick={() => setPage("main")}>
            Back
          </div>
          <input type="text" placeholder="Title" className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <input type="text" placeholder="Secret" className="input" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
          <button className="save" onClick={saveNewPair}>Save</button>
        </div>
      ) : (
        <>
          {codes.length > 0 ? (
            <>
              {codes.map((pair, index) => (
                <div key={index} className="mfamanager-card">
                  <div className="mfamanager-title">
                    {pair.title}
                  </div>
                  <div className="mfamanager-code-row">
                    <div className="mfamanager-code" onClick={() => navigator.clipboard.writeText(pair.code.toString())}>
                      {displayCode(pair.code)}
                    </div>
                    <div>
                      <span onClick={() => deleteCode(pair.secret)} className="link">Delete</span>
                    </div>
                  </div>
                  <div className="mfamanager-expiration">
                    {pair.expirationDisplay.toFixed(0)} seconds
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              No codes created.
            </>
          )}
          <div className="link" onClick={() => setPage("new")}>
            New
          </div>
        </>
      )}
    </div>
  );
}

export default App;