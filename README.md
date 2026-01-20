# DevUtils: Your Swiss Army Knife for Modern Devs

This app is built with these two: [Tauri](https://tauri.app/) and [Next.js](https://nextjs.org) (and by ❤️) It’s sleek, it’s cross-platform, and it’s here to make your development life just a little bit more awesome

Whether you’re crunching timestamps, slinging JWTs, wrestling with regex, or just flexing your inner hacker—DevUtils has a tool for (almost) every dev situation. And if it doesn’t? PRs are _always_ welcome 😉.

---

## Features That (Actually) Ship

- **Unicode to ASCII & Back:** Confuse your friends, impress your coworkers
- **Base64 Encoding/Decoding:** For your serious (or not) cryptographic ambitions
- **Blame Intern:** Quickly figure out who’s responsible (It’s probably you)
- **Color Picker, QR Maker, Regex Tester, and more:** Like a toolbox, but way more fun.
- **SSL Toothbrush:** Scrub those cert issues away with flair!
- **Deploy Roulette:** Feeling lucky?
- **How Many Clicks Did That Save?:** Track mouse miles avoided and earn goofy badges.
- **JWT Brute-Force Toothpick (edu):** Stress-test weak HMAC secrets without leaving DevUtils.
- **TCP/UDP Whistle:** Fire raw packets, listen locally, and fake slow or malformed replies.
- **Totally extensible:** Got a weird edge case? Add a tool, become immortal.

For a full list, dive into the `components/tools/` directory. Go wild.

---

## Getting Started

Go to the [release page](https://github.com/YueMiyuki/devutils/releases) and download the right one for your device!

---

## 📸 Screenshots

![Screenshot](https://raw.githubusercontent.com/YueMiyuki/devutils/refs/heads/main/.github/assets/Screenshot.png)

---

## 🤓 Dev/Debug Like a Legend

1. Clone the project
2. `pnpm install`
3. `pnpm tauri dev`

Then: Edit. Save. Watch the magic (or chaos) unfold.

---

## 🛠 Contributing

Want to build a tool? Found a bug? Think you can design a cooler logo? PRs, issues, and memes welcome!

1. Fork it 🪁
2. Create your feature branch: `git checkout -b my-awesome-feature`
3. Commit your changes: `git commit -m 'Add some feature'`  
   (You would have to pass our pre-commit checks here, good luck with that!)
4. Push to the branch: `git push origin my-awesome-feature`
5. Create a new Pull Request

Come for the tools, stay for the chill vibes.

---

## 🙋 FAQ

**Q: Why Tauri and Next.js?**  
A: Because Electron is heavy and we value RAM. Also: Rust is rad.

**Q: I broke something, halp?**  
A: Open an issue! Bonus points for funny bug descriptions. We fix stuff quick (usually).

**Q: Is this production-ready?**  
A: As much as any devtool built at midnight can be. Use it, break it, help it get better.

---

## ✨ Credits & Shoutouts

- [Tauri](https://tauri.app/) & [Next.js](https://nextjs.org) (You rock)
- The open-source community (that means you!)
- Side projects and caffeine ☕️
- [Cubic](https://www.cubic.dev/) & [CodeRabbit](https://coderabbit.ai/) (Very annoying)

**🤖 A Quick note about AI**
- This project use AI to assist the development, including:  
[Kimi](https://kimi.ai): Providing tool names and ideas (Try k2-thinking - its better than you thought!)  
[Claude](https://claude.com): From GitHub Copilot, for writing GitHub Actions (which I suck at)  
[Cursor](https://cursor.com/home): Documentaion (aka what you are looking at), Tab completion (very nice) (ran out of free credits quickly tho)   
[Cubic](https://www.cubic.dev/) and [CodeRabbit](https://coderabbit.ai/): Code Review, annoying but they does spot issues

<details>
<summary>My thoughts about AI Coding - Many text here</summary>

Many laughed about Vibe Coding, but to be honest, it sometimes could be exhausting reading AI's code - more tiring than writing them yourself.  
You see, LLMs write layers of defensive checks that a human would have compressed into a single elegant line, variable names that read like entire sentences, 
and comments that state the obvious with cheerful confidence.  

Yes, the code _works_, but it doesn't _think_.  

You quickly find yourself refactoring not for performance, but for comprehension, shrinking a 40-line AI solution into 8 lines that actually reveal intent.  
And sure, you do learn things from that, but highkey it is 10x less fun.  

I'm not saying that they are not helpful, they are indeed **VERY** helpful, it does save you time for things that really matters.  

It really depends on how you are using AI, think of it like a kitchen intern:  
If you just shout "make lunch!" and walk away, you'll return to a culinary catastrophe involving pickles, chocolate sauce, and a small fire.  
But if you stand there saying, "julienne these carrots, now sauté them gently for exactly 3 minutes," you get a sous-chef that actually saves you time.  
Vibe Coding works the same way. Are you the director giving clear scene-by-scene shots, or just yelling "make it cinematic!" from your trailer?  

The magic happens when you treat AI like an enthusiastic partner who needs boundaries, not a genie who grants buggy wishes.  
Pair its speed with your sanity-checks, and suddenly you're not just vibing—you're vibing productively.
</details>

---

Cheers,
The DevUtils Crew (That's only me)
