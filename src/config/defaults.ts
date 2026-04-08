import type { BenchmarkConfig } from '../types/index'

export interface PromptPreset {
  label: string
  group: 'output' | 'input'
  prompt: string
}

// ~1 token ≈ 4 chars for English text
function padToTokens(base: string, targetTokens: number): string {
  const targetChars = targetTokens * 4
  let text = base
  if (text.length < targetChars) {
    const repeats = Math.ceil(targetChars / text.length)
    text = Array(repeats).fill(text).join('\n\n')
  }
  const cut = text.lastIndexOf(' ', targetChars)
  return text.slice(0, cut > 0 ? cut : targetChars)
}

function sliceByTokens(text: string, targetTokens: number): string {
  const targetChars = targetTokens * 4
  const cut = text.lastIndexOf(' ', targetChars)
  return text.slice(0, cut > 0 ? cut : targetChars)
}

const LONG_PASSAGE = `The history of computing is a tapestry woven from mathematics, engineering, and human ingenuity. In the early 19th century, Charles Babbage conceived the Analytical Engine, a mechanical general-purpose computer that anticipated many features of modern machines. Ada Lovelace, working with Babbage, wrote what is often considered the first computer program—an algorithm for the Engine to compute Bernoulli numbers. Their work laid intellectual foundations that would not be realized in hardware for another century.

During World War II, the need to break enemy codes and calculate ballistic trajectories accelerated computing development. Alan Turing's theoretical work on computability and his practical contributions to code-breaking at Bletchley Park were pivotal. The Colossus machines, built by Tommy Flowers, were among the first electronic digital computers. Across the Atlantic, the ENIAC, completed in 1945, could perform 5,000 additions per second—a remarkable feat for its time, though it weighed 30 tons and consumed 150 kilowatts of power.

The invention of the transistor at Bell Labs in 1947 by John Bardeen, Walter Brattain, and William Shockley transformed electronics. Transistors were smaller, faster, more reliable, and consumed less power than vacuum tubes. By the late 1950s, transistorized computers were replacing their vacuum-tube predecessors. The integrated circuit, independently invented by Jack Kilby and Robert Noyce around 1958-1959, placed multiple transistors on a single chip, enabling further miniaturization and cost reduction.

The 1960s and 1970s saw the rise of mainframes and minicomputers. IBM's System/360 family, introduced in 1964, was a landmark in computer architecture, offering a range of compatible machines at different price points. Time-sharing systems allowed multiple users to interact with a single computer simultaneously, democratizing access. The development of UNIX at Bell Labs by Ken Thompson and Dennis Ritchie in the early 1970s provided a portable, multi-user operating system that profoundly influenced all subsequent OS design. The C programming language, also created by Ritchie, became the lingua franca of systems programming.

The microprocessor revolution began in 1971 with Intel's 4004, a 4-bit CPU on a single chip. The 8008, 8080, and eventually the 8086 followed, each more capable than the last. The Altair 8800, released in 1975, is often credited as the first commercially successful personal computer, though it required assembly and programming in machine code. The Apple II (1977), with its color graphics and expandability, and the IBM PC (1981), with its open architecture, brought personal computing to businesses and homes.

Software evolved in parallel. The concept of structured programming, advocated by Edsger Dijkstra, replaced unstructured goto-heavy code. Object-oriented programming, pioneered in Simula and Smalltalk, became mainstream through C++ and later Java. Database management systems evolved from hierarchical and network models to Edgar Codd's relational model, implemented in systems like Oracle, DB2, and eventually open-source alternatives like PostgreSQL and MySQL.

Networking transformed isolated computers into interconnected systems. ARPANET, funded by the US Department of Defense, demonstrated packet switching in 1969. The TCP/IP protocol suite, developed by Vint Cerf and Bob Kahn, became the foundation of the Internet. Tim Berners-Lee invented the World Wide Web at CERN in 1989, combining hypertext with the Internet to create an information space that would revolutionize communication, commerce, and culture.

The open-source movement, with roots in Richard Stallman's GNU Project (1983) and the Free Software Foundation, gained momentum with the release of the Linux kernel by Linus Torvalds in 1991. Open-source software demonstrated that collaborative, distributed development could produce world-class systems. Apache, Mozilla Firefox, Python, and countless other projects showed the model's viability across domains.

Modern computing is characterized by cloud infrastructure, mobile devices, machine learning, and massive scale. Data centers operated by companies like Amazon, Google, and Microsoft provide computing resources on demand. Smartphones, powered by ARM processors and running iOS or Android, have put powerful computers in billions of pockets. Machine learning, particularly deep learning with neural networks, has achieved remarkable results in image recognition, natural language processing, game playing, and protein structure prediction.

The challenges ahead include quantum computing, which promises exponential speedups for certain problems but requires overcoming formidable engineering obstacles. Cybersecurity threats grow more sophisticated as systems become more complex and interconnected. The ethical implications of artificial intelligence—bias, transparency, accountability, and the potential for misuse—demand careful consideration. Energy consumption by data centers and cryptocurrency mining raises environmental concerns that the industry must address.`

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    label: 'In ~10 · Out ~10',
    group: 'output',
    prompt: 'What is 2+2? Answer with just the number.',
  },
  {
    label: 'In ~30 · Out ~100',
    group: 'output',
    prompt: 'Explain what a hash table is and why O(1) average lookup. Keep it under 100 words.',
  },
  {
    label: 'In ~50 · Out ~1000',
    group: 'output',
    prompt: 'Explain how a CPU executes a single instruction, covering the fetch-decode-execute cycle, the role of registers, ALU, and control unit. Use a concrete example like ADD R1, R2, R3.',
  },
  {
    label: 'In ~100 · Out ~100',
    group: 'input',
    prompt: 'Summarize the following passage in 2-3 sentences (under 100 words).\n\n' + sliceByTokens(LONG_PASSAGE, 80),
  },
  {
    label: 'In ~1000 · Out ~100',
    group: 'input',
    prompt: 'Summarize the following article in one short paragraph (under 100 words). Focus on the 3 most important points.\n\n' + padToTokens(LONG_PASSAGE, 950),
  },
  {
    label: 'In ~10000 · Out ~100',
    group: 'input',
    prompt: 'Summarize the following long article in one short paragraph (under 100 words). List the 5 most important milestones mentioned.\n\n' + padToTokens(LONG_PASSAGE, 9900),
  },
]

export const CONFIG_STORAGE_KEY = 'api-bench-config'
export const DEFAULT_CONFIG: BenchmarkConfig = {
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  prompt: PROMPT_PRESETS[2].prompt,
  nonStreamIterations: 3,
  streamIterations: 3,
  concurrency: 1,
  pricingModelId: '',
  cacheTtl: '',
}
