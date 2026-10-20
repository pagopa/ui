// Every play function queries the rendered surface through the testing-library
// `findBy*` helpers, whose one-second default budget measures the runner rather
// than the story: a WebKit worker in CI takes longer than that to mount a story
// before the first query can see it, and the failure reads as a missing
// component. The accessibility contract polls on its own wall-clock budget
// (see ./a11y-contract.ts); this keeps the story queries on the same premise.
import { configure } from "storybook/test"

configure({ asyncUtilTimeout: 5000 })
