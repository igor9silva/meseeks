Our current auth (Convex Auth) has a few issues (like randomly breaking the session), is hard to expand (for example, we'd like Ethereum login), and I could not find a way to use it for Skill OAuth.

The most proeminent altenrative is [Better Auth](https://labs.convex.dev/better-auth/framework-guides/tanstack-start), but I'm not sure it'd solve the Skill OAuth problem.

by Skill OAuth I mean: some skills required OAuth autentication. We'd like to let users set up their own OAuth endpoints to use with their skills.

Our use case is OAuth 2 for the (very) new Twitter API v2.