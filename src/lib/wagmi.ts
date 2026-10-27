import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { polygonAmoy } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: [injected()],
  transports: {
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
  },
});