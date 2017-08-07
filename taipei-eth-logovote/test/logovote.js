const addressRegex = /^(0x)([A-Fa-f0-9]{2}){20}$/;
var LogoVote = artifacts.require('LogoVote')
var Vote = artifacts.require('Vote')
var Logo = artifacts.require('Logo')
var LogoVoteMock = artifacts.require('LogoVoteMock');

const etherBalanceOf = async function (account) {
  let balance = await web3.eth.getBalance(account)
  return web3.fromWei(balance, "ether").toNumber()
}

const assertAlmostEqual = function (number_a, number_b) {
  assert.isAtMost(Math.abs(number_a - number_b), 0.000001)
}

contract('LogoVote', function (accounts) {
  it('LogoVote and Vote instance should be ok.', function () {
    var logoVoteInstance
    var voteInstance
    return LogoVote.deployed().then(function (instance) {
      logoVoteInstance = instance
      return logoVoteInstance.totalReward.call()
    }).then(function (balance) {
      assert.equal(balance.valueOf(), 0)
      return logoVoteInstance.vote.call()
    }).then(function (voteAddress) {
      assert.isOk(voteAddress)
      return Vote.at(voteAddress)
    }).then(function (instance) {
      voteInstance = instance
      assert.isOk(voteInstance)
      return voteInstance.totalSupply.call()
    }).then(function (totalSupply) {
      assert.equal(totalSupply.valueOf(), 100000)
    })
  })

  it('#registLogo() should increase the length of logos array from 0 to 1 ',
    function () {
      var logoVote
      return LogoVote.deployed().then(function (instance) {
        logoVote = instance
        return logoVote.registLogo(accounts[0], accounts[1], 'http://logo0')
      }).then(function (_tx0) {
        assert.isOk(_tx0)
        return logoVote.getLogos.call()
      }).then(function (logos) {
        assert.equal(logos.length, 1)
      })
    })

  it('#registLogo() should create a new logo contract with correct author address',
    function () {
      var logoVote
      return LogoVote.deployed().then(function (instance) {
        logoVote = instance
        return logoVote.registLogo(accounts[0], accounts[1], 'http://logo0')
      }).then(function () {
        return logoVote.getLogos.call()
      }).then(function (logos) {
        assert.match(logos[0], addressRegex, 'logo address should be a 20 byte hex address');
        return Logo.at(logos[0])
      }).then(function (logo0) {
        assert.isOk(logo0)
        return logo0.author.call()
      }).then(function (author) {
        assert.equal(author, accounts[1], 'author address should be accounts[1]')
      })
    })

  it('#isLogo() should be ok', function () {
    var logoVote
    return LogoVote.deployed().then(function (instance) {
      logoVote = instance
      return Promise.all(
        [logoVote.registLogo(accounts[0], accounts[1], 'http://logo0'),
        logoVote.registLogo(accounts[1], accounts[2], 'http://logo1'),
        logoVote.registLogo(accounts[2], accounts[3], 'http://logo2')
        ])
    }).then(function (values) {
      assert.equal(values.length, 3)
      return logoVote.getLogos.call()
    }).then(function (logos) {
      return logoVote.isLogo.call(logos[0])
    }).then(function (_isLogoResult) {
      assert.isOk(_isLogoResult, 'isLogo should be ok for correct logo address')
      return logoVote.isLogo.call(0xdead)
    }).then(function (_isLogoResult) {
      assert.isNotOk(_isLogoResult, 'isLogo should not be ok for 0xdead address')
    })
  })

  it('should show #totalReward() 6.6 ether after #donate() 1.1, 2.2, and 3.3 ether.', function () {
    var logoVote
    return LogoVote.deployed().then(function (instance) {
      logoVote = instance
      // Sending Ether / Triggering the fallback function
      return logoVote.sendTransaction({
        from: accounts[0],
        value: web3.toWei(1.1, "ether")
      })
    }).then(function (_txr) {
      assert.isOk(_txr)
      return logoVote.totalReward.call()
    }).then(function (_totalReward) {
      assert.equal(_totalReward.valueOf(), web3.toWei(1.1, "ether"))
      return Promise.all([logoVote.sendTransaction({
        from: accounts[1],
        value: web3.toWei(2.2, "ether")
      }), logoVote.sendTransaction({
        from: accounts[2],
        value: web3.toWei(3.3, "ether")
      })])
    }).then(function (txs) {
      assert.isOk(txs)
      return logoVote.totalReward.call()
    }).then(function (_totalReward) {
      assert.equal(_totalReward.valueOf(), web3.toWei(6.6, "ether"))
    })
  })


  it('should be correct endBlock number', function () {
    var logovote
    //  // 30 * 24 * 60 * 60 / 15 = 172800
    const BLOCKNUM = 172800
    LogoVoteMock.new().then(function (instance) {
      assert.isOk(instance)
      logovote = instance
      return Promise.all([logovote.startBlock.call(), logovote.endBlock.call(), logovote.isRespectTimeFrame.call()])
    }).then(function (values) {
      assert.equal(values[1].toNumber(), values[0].toNumber() + BLOCKNUM)
      assert.isTrue(values[2], '#isRespectTimeFrame() should be true')
      // set mock blcok number to the time after the voting ends.
      return logovote.setMockedBlockNumber(BLOCKNUM + 10)
    }).then(function (tx) {
      assert.isOk(tx)
      return Promise.all([logovote.isAfterEnd.call(), logovote.getBlockNumber.call()])
    }).then(function (values) {
      assert.isTrue(values[0], '#isAfterEnd() should be true')
    })
  })

  it('#claimReward() should distribute correct rewards to logo authors', async function () {
    let contract_owner_account = accounts[0]
    let author1_account = accounts[1]
    let author1_owner_account = accounts[2]
    let author2_account = accounts[3]
    let author2_owner_account = accounts[4]
    let voter1_account = accounts[5]
    let BLOCKNUM = 172800
    let logoVote = await LogoVoteMock.new()
    await logoVote.registLogo(author1_owner_account, author1_account, 'http://logo1')
    await logoVote.registLogo(author2_owner_account, author2_account, 'http://logo2')
    await logoVote.sendTransaction({ from: voter1_account, value: web3.toWei(2.2, "ether") })
    let logos = await logoVote.getLogos()
    let author1_logo_address = logos[0]
    let author2_logo_address = logos[1]
    let vote = Vote.at(await logoVote.vote())
    let author1_init_ether = await etherBalanceOf(author1_account)
    let author2_init_ether = await etherBalanceOf(author2_account)
    let voter1_balance = await vote.balanceOf(voter1_account)
    assert.equal(voter1_balance.toNumber(), 2200, "voter1 should get 2200 vote token")
    await vote.transfer(author2_logo_address, 2200, { from: voter1_account })
    await logoVote.setMockedBlockNumber(BLOCKNUM + 10)

    await logoVote.claimWinner()

    let winner = await logoVote.winner()
    assert.equal(winner, author2_logo_address, "winner should be author2")
    let author1Logo = Logo.at(author1_logo_address)
    let author2Logo = Logo.at(author2_logo_address)
    await author1Logo.claimReward({ from: author1_owner_account })
    await author2Logo.claimReward({ from: author2_owner_account })
    let author1_now_ether = await etherBalanceOf(author1_account)
    let author2_now_ether = await etherBalanceOf(author2_account)
    let author1_reward = author1_now_ether - author1_init_ether
    let author2_reward = author2_now_ether - author2_init_ether
    assertAlmostEqual(2.2 * 0.25, author1_reward)
    assertAlmostEqual(2.2 * 0.75, author2_reward)

  })
})