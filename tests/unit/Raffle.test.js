const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");

network.config.chainId != "31337"
    ? describe.skip
    : describe("Raffle Unit Tests", async () => {
          var raffle, deployer, vrfCoordinatorV2Mock, player1, player2, player3, accounts;
          const participationFee = networkConfig[network.config.chainId]["participationFee"];
          const eventTriggerTimeStamp =
              networkConfig[network.config.chainId]["eventTriggerTimestamp"];

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              raffle = await ethers.getContract("Raffle", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              player1 = accounts[1];
              player2 = accounts[2];
              player3 = accounts[3];
          });

          describe("constructor", () => {
              it("Initialize raffle contract", async () => {
                  const raffleState = await raffle.getRaffleState();
                  const timeInterval = await raffle.getTimeInterval();
                  const participationFee = await raffle.getParticipationFee();
                  const callBackGasLimit = await raffle.getCallBackGasLimit();
                  assert.equal(raffleState.toString(), "0");
                  assert.equal(
                      timeInterval.toString(),
                      networkConfig[network.config.chainId]["eventTriggerTimestamp"]
                  );
                  assert.equal(
                      participationFee.toString(),
                      networkConfig[network.config.chainId]["participationFee"]
                  );
                  assert.equal(
                      callBackGasLimit.toString(),
                      networkConfig[network.config.chainId]["callBackGasLimit"]
                  );
              });
          });

          describe("Participate to lottery", () => {
              it("Reverts when not paying enough participation fee", async () => {
                  await expect(raffle.participate()).to.be.revertedWith(
                      "Raffle__InsuffisiantFunds"
                  );
              });
              it("Add participants to the contract", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await raffle.connect(player2).participate({ value: participationFee });

                  var participant1 = await raffle.getPlayer(0);
                  var participant2 = await raffle.getPlayer(1);

                  assert.equal(participant1, player1.address);
                  assert.equal(participant2, player2.address);
              });
              it("emits event when adding participant", async () => {
                  await expect(
                      raffle.connect(player1).participate({ value: participationFee })
                  ).to.emit(raffle, "HasParticipated");
              });
              it("does not allow any participant to enter when raffle is calculating", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);

                  await raffle.performUpkeep([]);

                  await expect(
                      raffle.connect(player2).participate({ value: participationFee })
                  ).to.be.revertedWith("Raffle__NotOpen");
              });
          });

          describe("CheckUpKeep", () => {
              it("returns false if people have not sent any eth", async () => {
                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

                  assert(upkeepNeeded == false);
              });
              it("returns false if raffle is not open", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep([]);
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

                  assert.equal(raffleState.toString(), "1");
                  assert(upkeepNeeded == false);
              });
          });

          describe("performUpkeep", () => {
              it("it must only run if checkUpKeep() is true", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);

                  const tx = await raffle.performUpkeep([]);
                  assert(tx);
              });
              it("it must revert if checkUpKeep() is false", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpKeepNotNeeded"
                  );
              });
              it("updates the raffle state, call vrf coordinator and finally emits event when performKeepUp has terminated correctly", async () => {
                  await raffle.connect(player1).participate({ value: participationFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);

                  const tx = await raffle.performUpkeep([]);
                  const txReceipt = await tx.wait(1);

                  const raffleState = await raffle.getRaffleState();

                  const requestId = txReceipt.events[1].args.requestId;
                  assert(requestId.toNumber() > 0);
                  assert.equal(raffleState.toString(), "1"); // 0 = open, 1 = calculating
              });
          });

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  //3 participants
                  await raffle.connect(player1).participate({ value: participationFee });
                  await raffle.connect(player2).participate({ value: participationFee });
                  await raffle.connect(player3).participate({ value: participationFee });

                  await network.provider.send("evm_increaseTime", [
                      Number(eventTriggerTimeStamp) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
              });

              it("picks a winner, resets, and sends money", async () => {
                  const startingTimeStamp = await raffle.getLastTimeStamp();
                  const numberOfParticipants = await raffle.getNumberOfPlayers();

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const recentWinner = await raffle.getWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLastTimeStamp();
                              const numberOfPlayers = await raffle.getNumberOfPlayers();
                              const winnerEndingBalance = await player3.getBalance();
                              console.log(recentWinner);

                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(raffleState, "0");
                              assert.equal(numberOfPlayers.toString(), "0");

                              // startingBalance + (raffleEntranceFee * numberOfPlayers)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(participationFee.mul(numberOfParticipants))
                                      .toString()
                              );
                              resolve();
                          } catch (e) {
                              reject(e);
                          }
                      });

                      const tx = await raffle.performUpkeep([]);
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance = await player3.getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
