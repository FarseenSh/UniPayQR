.PHONY: install build deploy test clean

install:
	forge install OpenZeppelin/openzeppelin-contracts --no-commit
	forge install foundry-rs/forge-std --no-commit

build:
	forge build

deploy:
	forge script script/Deploy.s.sol \
		--rpc-url $(MEZO_RPC_URL) \
		--broadcast \
		--chain-id 31611 \
		--private-key $(PRIVATE_KEY)

test:
	forge test -vvv

clean:
	forge clean

