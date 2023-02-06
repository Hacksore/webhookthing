import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export const ConnectionState = () => {
  // ping the server to see if it's up every 5 seconds
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const fetcher = async () => {
      fetch("/")
        .then(() => {
          if (!connected) {
            setConnected(true);
            toast("Connected", {
              icon: "🟢",
              id: "connected",
              duration: 2000,
            });
          }
        })
        .catch(() => {
          setConnected(false);
          toast("Disconnected", {
            icon: "🔴",
            id: "connected",
            duration: Infinity,
          });
        });
    };
    fetcher();

    const interval = setInterval(() => {
      fetcher();
    }, 5000);
    return () => clearInterval(interval);
  }, [connected]);
};
