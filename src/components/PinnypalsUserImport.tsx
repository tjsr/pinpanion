import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
// import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import { PinnypalsUserCollectionQuery } from '../pinnypals/types';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import { queryPinnypalsUser } from '../pinnypals/queryUser';
import { useState } from 'react';

const ErrorIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props}>
      <path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z" />
    </SvgIcon>
  );
};

type LoadState = 'loading' | 'error' | 'ready';

export const PinnypalsUserImport = (): JSX.Element => {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [username, setUsername] = useState<string>('');

  const retrieveLanyard = async (): Promise<void> => {
    setLoadState('loading');
    try {
      const data: PinnypalsUserCollectionQuery = await queryPinnypalsUser(username);
      console.log(data);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
    }
  };

  return (<>
    <FormGroup>
      <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
        {/* <InputLabel htmlFor="pinnypalsLanyardName">Pinnypals user</InputLabel> */}
        <TextField
          id="pinnypalsLanyardName"
          label="Retrieve a pinnypals profile lanyard - username"
          disabled={loadState == 'loading'}
          value={username}
          variant="outlined"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setUsername(event.target.value);
            setLoadState('ready');
            return true;
          }}
        />
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
        <LoadingButton
          id="pinnypalsLanyardRetrieveButton"
          loading={loadState === 'loading'}
          variant="contained"
          disabled={loadState !== 'ready'}
          endIcon={loadState === 'error' ? <ErrorIcon /> : <SearchIcon />}
          onClick={retrieveLanyard}>Retrieve</LoadingButton>
        <FormHelperText id="pinnypalsLanyardRetrieveButton-helper-text">
          This will query the currently published available and wanted lanyard for the given
          username and convert it to a list displayable in Pinpanion.
        </FormHelperText>
      </FormControl>
    </FormGroup></>);
};
{/* <Input id="my-input" aria-describedby="my-helper-text" /> */}
