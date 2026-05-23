# Scribe Voice Matrix Test Report

- **Generated:** 2026-05-22 06:29 UTC
- **Mode:** live API
- **Model:** `openrouter/free`
- **Matrix:** 5 document type(s) × 3 tones × 3 creativity levels = **45 cases**
- **Results:** 31 ok, 14 errors, 0 prompt-only

## Sample input (fixed for all cases)

```
I am writing to inform you that I will not be able to attend work today. I woke up with a headache and mild fever. I plan to rest and will check email this afternoon. Please let me know if anything urgent comes up.
```

## User prompt (fixed for all cases)

```
Rewrite the sample text below for the given document context. Keep the same facts; adjust style and structure only.

---
I am writing to inform you that I will not be able to attend work today. I woke up with a headache and mild fever. I plan to rest and will check email this afternoon. Please let me know if anything ur…
---
```

## Creativity levels

| Label | Temperature |
|-------|-------------|
| low | 0.3 |
| medium | 0.7 |
| high | 1.0 |

## Summary table

| Document | Tone | Creativity | Temp | Status | ms | Words | Banned hits | Quality |
|----------|------|------------|------|--------|-----|-------|-------------|---------|
| general | professional | low | 0.3 | ok | 7558 | 46 | — | 0.38 |
| general | professional | medium | 0.7 | ok | 6553 | 34 | — | 0.43 |
| general | professional | high | 1.0 | ok | 5524 | 38 | — | 0.40 |
| general | casual | low | 0.3 | error | 15017 | — | — | — |
| general | casual | medium | 0.7 | error | 16061 | — | — | — |
| general | casual | high | 1.0 | error | 15368 | — | — | — |
| general | formal | low | 0.3 | ok | 5215 | 45 | — | 0.41 |
| general | formal | medium | 0.7 | ok | 5410 | 49 | — | 0.43 |
| general | formal | high | 1.0 | ok | 4604 | 52 | — | 0.42 |
| email | professional | low | 0.3 | ok | 5177 | 48 | — | 0.47 |
| email | professional | medium | 0.7 | error | 15376 | — | — | — |
| email | professional | high | 1.0 | ok | 6644 | 52 | — | 0.46 |
| email | casual | low | 0.3 | ok | 4503 | 50 | — | 0.47 |
| email | casual | medium | 0.7 | ok | 5535 | 51 | — | 0.47 |
| email | casual | high | 1.0 | ok | 12757 | 44 | — | 0.46 |
| email | formal | low | 0.3 | ok | 7840 | 54 | — | 0.52 |
| email | formal | medium | 0.7 | error | 4382 | — | — | — |
| email | formal | high | 1.0 | ok | 6957 | 47 | — | 0.38 |
| academic | professional | low | 0.3 | ok | 13659 | 42 | — | 0.41 |
| academic | professional | medium | 0.7 | ok | 17530 | 43 | — | 0.41 |
| academic | professional | high | 1.0 | error | 15448 | — | — | — |
| academic | casual | low | 0.3 | ok | 21182 | 70 | — | 0.50 |
| academic | casual | medium | 0.7 | ok | 12174 | 47 | — | 0.46 |
| academic | casual | high | 1.0 | ok | 6954 | 43 | — | 0.39 |
| academic | formal | low | 0.3 | ok | 4300 | 44 | — | 0.41 |
| academic | formal | medium | 0.7 | ok | 14503 | 49 | — | 0.48 |
| academic | formal | high | 1.0 | ok | 5979 | 42 | — | 0.44 |
| business | professional | low | 0.3 | error | 21628 | — | — | — |
| business | professional | medium | 0.7 | ok | 16606 | 35 | — | 0.40 |
| business | professional | high | 1.0 | ok | 10246 | 37 | — | 0.42 |
| business | casual | low | 0.3 | error | 20313 | — | — | — |
| business | casual | medium | 0.7 | error | 4837 | — | — | — |
| business | casual | high | 1.0 | error | 8306 | — | — | — |
| business | formal | low | 0.3 | ok | 5229 | 35 | — | 0.42 |
| business | formal | medium | 0.7 | ok | 4479 | 32 | — | 0.43 |
| business | formal | high | 1.0 | ok | 4481 | 36 | — | 0.39 |
| creative | professional | low | 0.3 | error | 3826 | — | — | — |
| creative | professional | medium | 0.7 | ok | 11903 | 73 | — | 0.54 |
| creative | professional | high | 1.0 | ok | 4707 | 45 | — | 0.40 |
| creative | casual | low | 0.3 | ok | 7778 | 52 | — | 0.47 |
| creative | casual | medium | 0.7 | error | 5020 | — | — | — |
| creative | casual | high | 1.0 | error | 4420 | — | — | — |
| creative | formal | low | 0.3 | error | 15511 | — | — | — |
| creative | formal | medium | 0.7 | ok | 9743 | 49 | — | 0.39 |
| creative | formal | high | 1.0 | ok | 6162 | 52 | — | 0.42 |

## Response excerpts (live runs)

### general / professional / low (temp=0.3)

- Words: 46 | Banned phrases: none

```
I’m letting you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll skim email this afternoon, and if anything urgent pops up, just give me a heads‑up.
```

### general / professional / medium (temp=0.7)

- Words: 34 | Banned phrases: none

```
I won’t be in today—I woke up with a headache and a slight fever. I’ll be resting but will skim email this afternoon, so ping me if anything urgent comes up.
```

### general / professional / high (temp=1.0)

- Words: 38 | Banned phrases: none

```
I won’t be in today—I woke up with a headache and a low‑grade fever. I’ll rest, but I’ll still be checking email this afternoon. If something urgent pops up, just let me know.
```

### general / formal / low (temp=0.3)

- Words: 45 | Banned phrases: none

```
I’m writing to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll check my email this afternoon, and please flag any urgent matters for me.
```

### general / formal / medium (temp=0.7)

- Words: 49 | Banned phrases: none

```
I’m writing to let you know I won’t be able to come in today. I woke up with a headache and a mild fever, so I’ll be resting. I’ll monitor my email this afternoon and will respond to any urgent matters as soon as possible.
```

### general / formal / high (temp=1.0)

- Words: 52 | Banned phrases: none

```
I’m writing to let you know that I won’t be able to come in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll monitor my email this afternoon and will respond to any urgent matters as soon as I can.
```

### email / professional / low (temp=0.3)

- Words: 48 | Banned phrases: none

```
Subject: Out sick today  

Hi [Manager’s Name],

I’m down with a headache and a low‑grade fever, so I won’t be in today. I’ll be resting but will skim email this afternoon. If anything urgent pops up, just let me know.  

Thanks,  
[Your Name]
```

### email / professional / high (temp=1.0)

- Words: 52 | Banned phrases: none

```
Subject: Out sick today  

Hi [Manager’s Name],  

I’m feeling under the weather—headache and a low‑grade fever—so I won’t be in today. I’ll be resting but will skim my email this afternoon. If anything urgent pops up, just give me a heads‑up.  

Thanks,  
[Your Name]
```

### email / casual / low (temp=0.3)

- Words: 50 | Banned phrases: none

```
Subject: Out sick today

Hey [Manager’s Name],

Just a heads‑up—I’m down with a headache and a slight fever, so I won’t be in today. I’ll be resting but will skim email this afternoon. If anything urgent pops up, let me know.

Thanks,
[Your Name]
```

### email / casual / medium (temp=0.7)

- Words: 51 | Banned phrases: none

```
Subject: Out sick today

Hey [Manager’s Name],

Just a heads‑up—I’m down with a headache and a low‑grade fever, so I won’t be in today. I’ll be resting but will skim email this afternoon. If anything urgent pops up, let me know.

Thanks,
[Your Name]
```

### email / casual / high (temp=1.0)

- Words: 44 | Banned phrases: none

```
Hey,

Just a heads‑up—I’m out today. Woke up with a headache and a low‑grade fever, so I’m going to rest. I’ll skim email this afternoon, but if something urgent pops up, give me a shout.

Thanks,  
[Your Name]
```

### email / formal / low (temp=0.3)

- Words: 54 | Banned phrases: none

```
Subject: Out sick today

Hi [Manager’s Name],

I woke up with a headache and a mild fever, so I won’t be able to make it in today. I’ll be resting but will keep an eye on email this afternoon. If anything urgent comes up, just let me know.

Thanks,  
[Your Name]
```

### email / formal / high (temp=1.0)

- Words: 47 | Banned phrases: none

```
Hi, 
I'm not feeling well today - woke up with a headache and a bit of a fever. I'm going to take it easy and catch up on emails later this afternoon. If anything urgent comes up in the meantime, could you let me know?
Thanks,
[Your Name]
```

### academic / professional / low (temp=0.3)

- Words: 42 | Banned phrases: none

```
I’m writing to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll check email this afternoon, and please flag any urgent matters.
```

### academic / professional / medium (temp=0.7)

- Words: 43 | Banned phrases: none

```
I wanted to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll keep an eye on email this afternoon, and please flag anything urgent.
```

### academic / casual / low (temp=0.3)

- Words: 70 | Banned phrases: none

```
Subject: Absence from Work Today

Dear [Supervisor’s Name],

I’m writing to let you know that I’m unable to come into the office today. I woke up with a headache and a mild fever, so I’ll be resting at home. I’ll monitor my email this afternoon and respond to any urgent matters as soon as I can.

Thank you for your understanding.

Best regards,  
[Your Name]
```

### academic / casual / medium (temp=0.7)

- Words: 47 | Banned phrases: none

```
I am writing to let you know that I will be absent from work today. I woke up with a headache and a mild fever, so I plan to rest and monitor my condition. I will stay on email and respond to any urgent matters this afternoon.
```

### academic / casual / high (temp=1.0)

- Words: 43 | Banned phrases: none

```
Just a heads‑up—I won’t make it in today. Woke up with a headache and a low‑grade fever, so I’m going to rest. I’ll skim email this afternoon, and if anything urgent pops up, just let me know.
```

### academic / formal / low (temp=0.3)

- Words: 44 | Banned phrases: none

```
I’m writing to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll skim my email this afternoon and will respond if anything urgent arises.
```

### academic / formal / medium (temp=0.7)

- Words: 49 | Banned phrases: none

```
I am writing to inform you that I will be unable to attend work today. I woke with a headache and a mild fever, so I will rest and monitor my condition. I will review emails later this afternoon. Please let me know if anything urgent requires my attention.
```

### academic / formal / high (temp=1.0)

- Words: 42 | Banned phrases: none

```
I’m writing to let you know I won’t be able to come in today. I woke up with a headache and a mild fever, so I’ll be resting. I’ll check my email this afternoon; just flag anything urgent.
```

### business / professional / medium (temp=0.7)

- Words: 35 | Banned phrases: none

```
I’m out sick today— woke up with a headache and a low‑grade fever. I’ll be resting, but I’ll skim email this afternoon. If anything urgent pops up, just let me know.
```

### business / professional / high (temp=1.0)

- Words: 37 | Banned phrases: none

```
I won’t be in today—I woke up with a headache and a low‑grade fever. I’ll rest and keep an eye on email this afternoon, so just ping me if something urgent pops up.
```

### business / formal / low (temp=0.3)

- Words: 35 | Banned phrases: none

```
I’m unable to come in today. I woke up with a headache and a mild fever, so I’ll be resting. I’ll check email this afternoon; let me know if anything urgent arises.
```

### business / formal / medium (temp=0.7)

- Words: 32 | Banned phrases: none

```
I won’t be in today—woke up with a headache and a low‑grade fever. I’ll rest and keep an eye on email this afternoon, so just flag anything urgent.
```

### business / formal / high (temp=1.0)

- Words: 36 | Banned phrases: none

```
I’m out sick today—woke up with a headache and a low‑grade fever. I’ll be resting, but I’ll skim my email this afternoon. If something urgent pops up, just let me know.
```

### creative / professional / medium (temp=0.7)

- Words: 73 | Banned phrases: none

```
Subject: Absence for Today

Hi Team,

I’m writing to let you know I’m unwell and won’t be able to make it to work today. I woke up with a headache and a mild fever, so I’ll be taking a rest day and checking email in the afternoon. If anything urgent comes up, please flag it and I’ll address it as soon as I’m able.

Thanks for understanding.
```

### creative / professional / high (temp=1.0)

- Words: 45 | Banned phrases: none

```
Just a heads‑up—I’m out sick today. Woke up with a pounding headache and a low‑grade fever, so I’m going to rest. I’ll skim my email this afternoon, but if something truly urgent pops up, please give me a shout.
```

### creative / casual / low (temp=0.3)

- Words: 52 | Banned phrases: none

```
Hey team,

Woke up feeling pretty rough - headache and a bit of a fever. Gonna stay home and rest up today. I'll check emails later this afternoon though. If anything super urgent pops up, just shoot me a message and I'll do my best to help out.

Thanks for understanding,
[Your Name]
```

### creative / formal / medium (temp=0.7)

- Words: 49 | Banned phrases: none

```
I’m writing to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll skim my email this afternoon, and if anything urgent pops up, just give me a heads‑up.
```

### creative / formal / high (temp=1.0)

- Words: 52 | Banned phrases: none

```
I’m writing to let you know I can’t make it in today. I woke up with a headache and a low‑grade fever, so I’ll be resting. I’ll keep an eye on my email this afternoon, and if anything urgent comes up, just give me a heads‑up.
```


## Errors

- **general / casual / low:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **general / casual / medium:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **general / casual / high:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **email / professional / medium:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **email / formal / medium:** Model not available (404): openrouter/free
- **academic / professional / high:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **business / professional / low:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **business / casual / low:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.
- **business / casual / medium:** Model not available (404): openrouter/free
- **business / casual / high:** Model not available (404): openrouter/free
- **creative / professional / low:** Model not available (404): openrouter/free
- **creative / casual / medium:** Model not available (404): openrouter/free
- **creative / casual / high:** Model not available (404): openrouter/free
- **creative / formal / low:** Failed to get a response from OpenRouter after multiple retries, or the model returned no text — try another model or simplify the prompt.

## How to re-run

```bash
# Prompt-only (no API key):
python3 backend/scripts/dev/run_voice_matrix_test.py

# Full live matrix (needs OPENROUTER_API_KEY in repo-root .env):
python3 backend/scripts/dev/run_voice_matrix_test.py --live

# Smaller matrix (general only):
python3 backend/scripts/dev/run_voice_matrix_test.py --live --quick
```
