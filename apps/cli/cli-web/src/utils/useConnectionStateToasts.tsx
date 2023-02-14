import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";

export const useConnectionStateToasts = () => {
  const [connected, setConnected] = useState(false);

  const {} = useQuery(
    ["connectionState"],
    () =>
      fetch("/")
        .then((res) => res.text())
        .catch(() => {
          throw new Error("Connection error");
        }),
    {
      refetchInterval: 2000,
      retry: false,
      onSuccess() {
        if (!connected) {
          toast("Connected to CLI server", {
            icon: "🟢",
            duration: 2000,
            id: "connState",
          });
          setConnected(true);
        }
      },
      onError() {
        toast("Disconnected from CLI server", {
          icon: "🔴",
          duration: Infinity,
          id: "connState",
        });
        setConnected(false);
      },
    }
  );
};
