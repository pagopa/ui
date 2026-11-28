// Declares the condition this project is meant to run under, so the contract
// can tell "the browser honoured the preference" from "the project lost the
// context option and is silently a second default pass".
globalThis.__pagopaCondition = { reducedMotion: true }
