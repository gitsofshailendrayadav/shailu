#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Env, Address, String};

#[test]
fn test_init() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_mint_and_query() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    let user = Address::generate(&env);
    let token_id = client.mint(
        &user,
        &String::from_str(&env, "My NFT"),
        &String::from_str(&env, "A cool NFT"),
        &String::from_str(&env, "https://example.com/nft.json"),
    );

    assert_eq!(token_id, 1);
    assert_eq!(client.total_supply(), 1);
    assert_eq!(client.balance_of(&user), 1);
    assert_eq!(client.owner_of(&token_id), user);

    let uri = client.token_uri(&token_id);
    assert_eq!(uri, String::from_str(&env, "https://example.com/nft.json"));
}

#[test]
fn test_mint_multiple_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let id1 = client.mint(&alice, &String::from_str(&env, "NFT1"), &String::from_str(&env, "First"), &String::from_str(&env, "uri1"));
    let id2 = client.mint(&alice, &String::from_str(&env, "NFT2"), &String::from_str(&env, "Second"), &String::from_str(&env, "uri2"));
    let id3 = client.mint(&bob, &String::from_str(&env, "NFT3"), &String::from_str(&env, "Third"), &String::from_str(&env, "uri3"));

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
    assert_eq!(client.total_supply(), 3);
    assert_eq!(client.balance_of(&alice), 2);
    assert_eq!(client.balance_of(&bob), 1);

    // Check tokens_of
    let alice_tokens = client.tokens_of(&alice);
    assert_eq!(alice_tokens, vec![&env, 1u64, 2u64]);

    let bob_tokens = client.tokens_of(&bob);
    assert_eq!(bob_tokens, vec![&env, 3u64]);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let token_id = client.mint(&alice, &String::from_str(&env, "My NFT"), &String::from_str(&env, "Desc"), &String::from_str(&env, "uri"));

    // Alice transfers to Bob
    client.transfer(&alice, &bob, &token_id);

    assert_eq!(client.owner_of(&token_id), bob);
    assert_eq!(client.balance_of(&alice), 0);
    assert_eq!(client.balance_of(&bob), 1);

    // Check tokens_of updated
    let alice_tokens = client.tokens_of(&alice);
    assert_eq!(alice_tokens.len(), 0);

    let bob_tokens = client.tokens_of(&bob);
    assert_eq!(bob_tokens.len(), 1);
    assert_eq!(bob_tokens.get(0).unwrap(), token_id);
}

#[test]
#[should_panic(expected = "not owner")]
fn test_transfer_not_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    let token_id = client.mint(&alice, &String::from_str(&env, "My NFT"), &String::from_str(&env, "Desc"), &String::from_str(&env, "uri"));

    // Bob tries to transfer Alice's token
    client.transfer(&bob, &charlie, &token_id);
}

#[test]
#[should_panic(expected = "not found")]
fn test_query_nonexistent_token() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();
    client.owner_of(&999);
}

#[test]
fn test_mint_to_different_users() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.init();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &String::from_str(&env, "A"), &String::from_str(&env, "A desc"), &String::from_str(&env, "uri1"));
    client.mint(&bob, &String::from_str(&env, "B"), &String::from_str(&env, "B desc"), &String::from_str(&env, "uri2"));
    client.mint(&alice, &String::from_str(&env, "C"), &String::from_str(&env, "C desc"), &String::from_str(&env, "uri3"));

    assert_eq!(client.total_supply(), 3);
    assert_eq!(client.balance_of(&alice), 2);
    assert_eq!(client.balance_of(&bob), 1);

    // Verify tokens_of
    let alice_tokens = client.tokens_of(&alice);
    assert_eq!(alice_tokens.len(), 2);
    assert!(alice_tokens.contains(1));
    assert!(alice_tokens.contains(3));

    let bob_tokens = client.tokens_of(&bob);
    assert_eq!(bob_tokens.len(), 1);
    assert!(bob_tokens.contains(2));
}
