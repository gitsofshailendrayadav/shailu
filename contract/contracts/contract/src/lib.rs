#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub enum DataKey {
    Counter,
    Owner(u64),
    Token(u64),
    Balances(Address),
    TotalSupply,
}

#[contracttype]
#[derive(Clone)]
pub struct TokenMetadata {
    pub name: String,
    pub description: String,
    pub uri: String,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn init(env: Env) {
        env.storage().instance().set(&DataKey::Counter, &0u64);
        env.storage().instance().set(&DataKey::TotalSupply, &0u64);
    }

    pub fn mint(env: Env, to: Address, name: String, description: String, uri: String) -> u64 {
        to.require_auth();
        let mut counter: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&DataKey::Counter, &counter);
        let meta = TokenMetadata { name, description, uri };
        env.storage().persistent().set(&DataKey::Owner(counter), &to);
        env.storage().persistent().set(&DataKey::Token(counter), &meta);
        let mut tokens: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::Balances(to.clone()))
            .unwrap_or(Vec::new(&env));
        tokens.push_back(counter);
        env.storage().persistent().set(&DataKey::Balances(to), &tokens);
        let mut supply: u64 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        supply += 1;
        env.storage().instance().set(&DataKey::TotalSupply, &supply);
        counter
    }

    pub fn transfer(env: Env, from: Address, to: Address, id: u64) {
        from.require_auth();
        let owner: Address = env.storage().persistent().get(&DataKey::Owner(id)).expect("not found");
        if owner != from {
            panic!("not owner");
        }
        env.storage().persistent().set(&DataKey::Owner(id), &to);
        let mut from_tokens: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::Balances(from.clone()))
            .expect("not found");
        let len = from_tokens.len();
        for i in 0..len {
            if from_tokens.get(i).unwrap() == id {
                from_tokens.remove(i);
                break;
            }
        }
        env.storage().persistent().set(&DataKey::Balances(from), &from_tokens);
        let mut to_tokens: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::Balances(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_tokens.push_back(id);
        env.storage().persistent().set(&DataKey::Balances(to), &to_tokens);
    }

    pub fn balance_of(env: Env, owner: Address) -> u32 {
        let tokens: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::Balances(owner))
            .unwrap_or(Vec::new(&env));
        tokens.len() as u32
    }

    pub fn owner_of(env: Env, id: u64) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(id))
            .expect("not found")
    }

    pub fn token_uri(env: Env, id: u64) -> String {
        let meta: TokenMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id))
            .expect("not found");
        meta.uri
    }

    pub fn total_supply(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    pub fn tokens_of(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::Balances(owner))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;
