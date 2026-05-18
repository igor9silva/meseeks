---
title: ERC-8004 agent trust and discovery
tags: [tech, scraped, source:ticktick, ticktick-list:meseeks, ticktick-status:inbox, class:reference]
---

Marco De Rossi's ERC-8004 thread on agents discovering, trusting, validating, reviewing, and paying each other without a central intermediary.

This is likely relevant to Meseeks if we want agent identity, reputation, portable capabilities, wallet/payment proofs, or decentralized agent discovery.

## Raw thread

1. [Marco De Rossi](https://x.com/marco_derossi/status/1976257886390002116), 2025-10-09T12:06:11.000Z:

> LIVE NOW: AI Agents can discover and trust each other without a central intermediary. This lays the foundation for open agent economies.
>
> ERC-8004 v1, co-authored with @DavideCrapis (@Ethereumfndn), @Jordan0Ellis (@Google) and - welcome Erik! - @programmer (@Coinbase) is now live.
>
> It improves the August draft thanks to the inputs of hundreds of builders. Learn more about what this means for the future decentralized AI ↓

2. [Agents are NFTs](https://x.com/marco_derossi/status/1976257890588496371):

> 2/ Agents are NFTs
>
> You can mint, view in wallets, transfer, and manage them (including delegations to operators) using existing 721 infra & apps. https://t.co/TFjzcZ8pJV

3. [Agents are portable](https://x.com/marco_derossi/status/1976257893860081809):

> 3/ Agents are portable
>
> ERC-8004 provides logically centralized permissionless discovery.
>
> The NFT points to a registration file listing name, skills, capabilities, and endpoints (A2A, MCP, ENS, DIDs, wallets). Anyone can build explorers.
>
> Follow the standard and your agent shows up in *any* agent explorer. Full portability, no silos.

4. [Reputation is on-chain](https://x.com/marco_derossi/status/1976257897110593742):

> 4 / Reputation is on-chain.
>
> Using scores and custom tags (tag1, tag2), anyone can submit​, store and aggregate reputation signals on-chain. Events + optional extended feedback on IPFS power sophisticated off-chain analysis.
>
> AI is the catalyst for distributed reputation on Ethereum.

5. [MCP support](https://x.com/marco_derossi/status/1976257900377944457):

> 5 / MCP support
>
> Not just A2A: with ERC-8004 you can discover (see the registration file) and review MCP prompts/resources/tools. https://t.co/HbMSGBie0w

6. [x402 enriches feedback](https://x.com/marco_derossi/status/1976257903838351752):

> 6 / x402 enriches feedback
>
> Attach x402 payment proofs to feedback for stronger, value-weighted reputation. https://t.co/JxncxOQKyu

7. [Validations registry](https://x.com/marco_derossi/status/1976257906958901400):

> 7 / Validations Registry
>
> Agents can send requests to validator smart contracts implementing TEE oracles, stake-secured inference, or zkML verification.
>
> It’s a registry: ERC-8004 standardizes visibility, while validation logic is defined and maintained by the community. https://t.co/p5UXt8u8pa

8. [Gasless, easy indexing](https://x.com/marco_derossi/status/1976257909546946747):

> 8 / Gasless, easy indexing
>
> DevEx upgrades:
> • Clients don’t need to register → enables ​7702 ⛽️ gasless feedback flows (sign + relay).
> • Blend on-chain data with IPFS resources → straightforward subgraph indexing and faster UIs.

9. [Spec and release links](https://x.com/marco_derossi/status/1976257911425733044):

> 9 / Full spec here: https://t.co/ySDYnlYEJB
>
> Press-release: https://t.co/a8Z5JHpSGI
>
> Live on test net next week / community-built SDKs coming soon! 🚀

10. [Acknowledgements](https://x.com/marco_derossi/status/1976257913627815978):

> 10 / The last six weeks have been 𝐬𝐨 intense. An incredibly complex technical and coordination puzzle.
>
> It was an honor to build with you guys! It truly felt like the early open-source days.
>
> Too many to list! Thanks @pcarranzav (@edgeandnode), @nxt3d (@unruggable_eth), @Richard67755922, @binji_x, @_sumeetc (@nethermind), @nima_vaziri (@eigencloud), @bgmshana & team (@PhalaNetwork), @JustinZhang (@sparsity_xyz), @dayanxyz, @CottenIO (Scrypted), Shaw & team (ElizaLabs), @socrates1024, @carsonroscoe7 and @MurrLincoln (Coinbase), @ernestognw (@OpenZeppelin), @iamnotnicola (@ARIA_research), @nickzakirov (@terminal3io), @autonolas (@autonolas), @MattOber1 (@pinatacloud), @Cameron_Dennis_ (@NEARProtocol) and @lucamuscariello (@Cisco).
>
> And thanks to my 🏠home base @Consensys ❤️

## Extra author replies

- Wallets can be managed with EOAs, smart contract delegations, session keys, MCP key management, server wallets, or other approaches; agents can advertise a public address as on-chain metadata in the ERC-8004 identity registry under `walletAddress`.
- Marco mentioned creating tooling to natively register Gaia agents on ERC-8004.
- Marco said the next step is making tooling and DevEx easy.
- Marco described EigenCloud as a cornerstone of ERC-8004 and mentioned stake-secured inference trust models.

## Source

- URL: https://x.com/marco_derossi/status/1976257886390002116?s=12&t=fpfVVVXvGdro5tlVeroG9A
- Posted: 2025-10-09T12:06:11.000Z
- Author: [@marco_derossi](https://x.com/marco_derossi) Marco De Rossi
- Metrics at scrape time: Likes: 1072 | Retweets: 224 | Replies: 143 | Views: 321277 | Quotes: 115 | Bookmarks: 426
