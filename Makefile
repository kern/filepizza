# ==============================================================================
# config

.PHONY: all build clean install push run

all: run

WATCH ?= false
TAG ?= latest

# ==============================================================================
# phony targets

build:
	./node_modules/.bin/babel src --ignore __tests__,__mocks__ --out-dir dist
	./node_modules/.bin/webpack --optimize-minimize ./src/client
	docker build -t kern/filepizza:$(TAG) .

clean:
	@ rm -rf node_modules
	@ rm -rf dist

install:
	npm install

push: build
	docker push kern/filepizza:$(TAG)

run: | node_modules
	@ if [ "$(WATCH)" = false ]; then \
		./node_modules/.bin/babel-node src; \
	else \
		./node_modules/.bin/nodemon ./node_modules/.bin/babel-node -i dist src; \
	fi

# ==============================================================================
# file targets

node_modules:
	npm install
