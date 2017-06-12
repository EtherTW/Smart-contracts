pragma solidity ^0.4.10;
import "./Vote.sol";
import "./Logo.sol";
import "./Pausable.sol";
import "./SafeMath.sol";
import "./Faucet.sol";

contract LogoVote is Pausable, SafeMath{

	Vote public vote;
	Faucet public faucet;
	Logo[] public logos;

	mapping (address => uint) backers;
	mapping (address => bool) rewards;
	uint rewardClaimed;

	uint public votePerETH;
	uint public totalReward;
	uint public startBlock;
	uint public endBlock;
	address public winner;
	bool public contractAvailable;

	event ReceiveDonate(address addr, uint value);

	modifier respectTimeFrame() {
		if (block.number > endBlock) throw;
		_;
	}

	modifier afterEnd() {
		if (block.number < endBlock) throw;
		_;
	}

	function LogoVote() {
		vote = new Vote();
		faucet = new Faucet(vote);
		votePerETH = 1000; // donate 0.001 ether to get 1 vote 
		totalReward = 0;
		startBlock = block.number;
		endBlock = startBlock + ( 30 * 24 * 60 * 60 / 15 ); //end in 30 days
		rewardClaimed = 0;
		rewardClaimed = 0;
	}

	function sendToFaucet(uint _amount) onlyOwner {
		if(!vote.transfer(faucet, _amount)) throw;
	}

	function sendVote(address _to, uint _amout) onlyOwner afterEnf {
		if(!vote.transfer(_to, _amount)) throw;
	}

	function registLogo(address _owner, address _author, string _metadatUrl) 
						onlyOwner respectTimeFrame returns (address) {
		Logo logoAddress = new Logo(_owner, _author, _metadatUrl);
		logos.push(logoAddress);
		return logoAddress;
	}

	function donate(address beneficiary) internal stopInEmergency respectTimeFrame {
		uint voteToSend = safeMul(msg.value, votePerETH)/(1 ether);
		if (!vote.transfer(beneficiary, voteToSend)) throw; 
		backers[beneficiary] = safeAdd(backers[beneficiary], msg.value);
		totalReward = safeAdd(totalReward, msg.value);

		ReceiveDonate(beneficiary, msg.value);
	}

	function claimReward (address _receiver) stopInEmergency afterEnd {
		if (!isLogo(msg.sender)) throw;
		if (rewards[msg.sender]) throw;
		if (rewardClaimed == logos.length) throw;
		uint amount = totalReward / safeMul(2, logos.length); // all logos share the 50% of rewards
		if (msg.sender == winner) {
			amount = safeAdd(amount, totalReward/2);
		}
		rewards[msg.sender] = true;
		rewardClaimed = safeAdd(rewardClaimed, 1);
		if (!msg.sender.send(amount)) throw;
	}

	function claimReward (address _receiver) stopInEmergency afterEnd {
		if (msg.sender != winner) throw;
		if (!_receiver.send(this.balance)) throw;
	}

	function isLogo (address _logoAddress) constant returns (bool) {
		for (uint8 i = 0; i < logos.length; i++) {
			if (logos[i] == _logoAddress) return true;
		}
	}

	function claimWinner () onlyOwner afterEnd {
		if (isLogo(winner)) throw;
		winner = logos[0];
		for (uint8 i = 1; i < logos.length; i++) {
			if (vote.balanceOf(logos[i]) > vote.balanceOf(winner))
				winner = logos[i];
		} 
	}

	function cleanBalance () onlyOwner afterEnd {
		if (rewardClaimed >= logos.length || block.number < endBlock + 43200) throw;
		if (!owner.send(this.balance)) throw;
	}

	function () payable {
		if (block.number > endBlock) throw;
		donate(msg.sender);
	}
}