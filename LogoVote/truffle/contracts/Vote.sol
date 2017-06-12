pragma solidity ^0.4.10;
import "./ERC20.sol";
import "./SafeMath.sol";

contract Vote is ERC20, SafeMath{

	mapping (address => uint) balances;
	mapping (address => mapping (address => uint)) allowed;

	uint public totalSupply;
	uint public initialSupply;
	string public name;
	string public symbol;
	uint8 public decimals;

	function Vote(){
		initialSupply = 100000;
		totalSupply = initialSupply;
		balances[msg.sender] = initialSupply;
		name = "EthTaipei Logo Vote";
		symbol = "EthTaipei Logo";
		decimals = 0;
	}

	function transfer(address _to, uint _value) returns (bool) {
	    balances[msg.sender] = safeSub(balances[msg.sender], _value);
	    balances[_to] = safeAdd(balances[_to], _value);
	    Transfer(msg.sender, _to, _value);
	    return true;
  	}

  	function transferFrom(address _from, address _to, uint _value) returns (bool) {
	    var _allowance = allowed[_from][msg.sender];	    
	    balances[_to] = safeAdd(balances[_to], _value);
	    balances[_from] = safeSub(balances[_from], _value);
	    allowed[_from][msg.sender] = safeSub(_allowance, _value);
	    Transfer(_from, _to, _value);
	    return true;
  	}

  	function approve(address _spender, uint _value) returns (bool) {
    	allowed[msg.sender][_spender] = _value;
    	Approval(msg.sender, _spender, _value);
    	return true;
  	}

  	function balanceOf(address _address) constant returns (uint balance) {
  		return balances[_address];
  	}

  	function allowance(address _owner, address _spender) constant returns (uint remaining) {
    	return allowed[_owner][_spender];
  	}

}