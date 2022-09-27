const randomIntFromInterval = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const randomLineFromFile = async (
  file: string,
  maxLines: number
): Promise<string> => {
  const textFile: Response = await fetch(file, {
    mode: 'cors',
  });
  const textFileData: string = await textFile?.text();
  const lines: string[] | undefined = textFileData.split('\n');
  const randomLine: number = randomIntFromInterval(0, maxLines);
  return Promise.resolve(lines[randomLine]);
};

export const generateRandomName = async (): Promise<string> => {
  const adjective: string = await randomLineFromFile('adjectives.txt', 1023);
  const animal: string = await randomLineFromFile('animals.txt', 187);
  const output = `${adjective} ${animal}`;
  return Promise.resolve(output);
};
