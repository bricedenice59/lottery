const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");

//rinkeby
network.config.chainId == "4"
    ? describe("Raffle Staging Tests", async () => {
          var raffle, deployer, player1;
          const participationFee = networkConfig[network.config.chainId]["participationFee"];

          beforeEach(async () => {
              var accounts = await ethers.getSigners();
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract("Raffle", deployer);

              player1 = accounts[1];
          });

          describe("fulfillRandomWords", () => {
              it("live Chainlink Keepers and VRF", async () => {
                  const startingTimeStamp = await raffle.getLastTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const recentWinner = await raffle.getWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLastTimeStamp();
                              const numberOfPlayers = await raffle.getNumberOfPlayers();
                              const winnerEndingBalance = await player1.getBalance();
                              console.log(recentWinner);

                              assert.equal(recentWinner.toString(), player1.address);
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(raffleState, "0");
                              assert.equal(numberOfPlayers.toString(), "0");

                              // startingBalance + (raffleEntranceFee * numberOfPlayers)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(participationFee.mul(numberOfPlayers))
                                      .toString()
                              );
                              resolve();
                          } catch (e) {
                              reject(e);
                          }
                      });

                      await raffle.connect(player1).participate({ value: participationFee });
                      const winnerStartingBalance = await player1.getBalance();
                  });
              });
          });
      })
    : describe.skip;
