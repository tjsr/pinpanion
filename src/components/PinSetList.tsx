import { SizesType } from '../types';

interface PinSetListPropTypes {
  descendingAge: boolean;
  displaySize?: SizesType;
  heading?: string;
}

export const PinSetList = (props: PinSetListPropTypes): JSX.Element => {
  const {
    descendingAge,
    displaySize = 'normal',
    heading,
  } = props;
  return <></>;
};
