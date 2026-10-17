.PHONY: run build test check

run:
	npm run dev

build:
	npm run build

test:
	npm test

check:
	npm test
	npm run build
	npm run test:browser
