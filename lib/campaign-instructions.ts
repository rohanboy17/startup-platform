type CampaignInstructionInput = {
  id: string;
  sequence: number;
  instructionText: string;
};

function stableIndex(input: string, length: number) {
  if (length <= 0) return 0;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash % length;
}

export function pickCampaignInstruction(input: {
  userId: string;
  campaignId: string;
  occupiedSubmissions: number;
  userSubmissionCount: number;
  instructions: CampaignInstructionInput[];
}) {
  const remainingInstructions = input.instructions.slice(input.occupiedSubmissions);
  const instructionPool =
    remainingInstructions.length > 0 ? remainingInstructions : input.instructions;

  if (instructionPool.length === 0) return null;

  return instructionPool[
    stableIndex(
      `${input.userId}:${input.campaignId}:${input.occupiedSubmissions}:${input.userSubmissionCount}`,
      instructionPool.length
    )
  ];
}
