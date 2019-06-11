import _ from 'lodash';
import React, {useMemo, useState} from 'react';
import {css} from 'emotion';
import {connect} from 'react-redux';
import {Button, Col, Row} from 'reactstrap';
import Localized from 'components/Localized/Localized';
import {useTranslation} from 'react-i18next';
import gameLocationsSelector from 'selectors/gameLocations';
import {DEFAULT_LOCATIONS, GAME_STATES, MAX_PLAYERS, MAX_ROLES, MIN_PLAYERS, SPY_ROLE} from 'consts';
import usePresence from 'hooks/usePresence';
import {updateGame} from 'services/game';
import {store} from 'store';

import ResultPopup from './ResultPopup';

const getPlayerRoles = (allPlayers, availableRoles) => {
  const shuffledRoles = _.shuffle(availableRoles);
  const newPlayersRoles = allPlayers.reduce((obj, playerId, index) => {
    obj[playerId] = shuffledRoles[index];
    return obj;
  }, {});
  const newSpies = _.keys(_.pickBy(newPlayersRoles, (v) => v === SPY_ROLE));

  return {newPlayersRoles, newSpies};
};

export const GameManager = ({started, room, roomId, roomConnected, gameLocations, playersCount}) => {
  const [t] = useTranslation();
  const [showResultPopup, setShowResultPopup] = useState(false);
  const totalNumberOfPlayers = useMemo(() => playersCount + _.size(room?.remotePlayers), [playersCount, room]);
  const canStartGame = useMemo(() => totalNumberOfPlayers >= MIN_PLAYERS && totalNumberOfPlayers <= MAX_PLAYERS, [totalNumberOfPlayers]);

  const onStartGame = async () => {
    const {
      game: {location, spies},
      config: {players, spyCount, customLocations},
    } = store.getState();

    const newState = GAME_STATES.STARTED;
    const allPlayers = [...players];
    if(room){
      _.forEach(room.remotePlayers, (remotePlayer, remotePlayerId) => {
        allPlayers.push(remotePlayerId);
      });
    }
    const gameLocationsIds = _.keys(gameLocations);
    const selectedLocationId = _.sample(gameLocationsIds.length > 1 ? _.without(gameLocationsIds, location) : gameLocationsIds);
    let selectedLocation;
    let locationRoles;

    if(DEFAULT_LOCATIONS[selectedLocationId]){
      selectedLocation = selectedLocationId;
      locationRoles = _.compact(_.times(MAX_ROLES).map((index) => {
        const rolePath = `location.${selectedLocationId}.role${index + 1}`;
        const role = t(rolePath);
        return role === rolePath ? '' : index;
      }));
    }else{
      selectedLocation = customLocations[selectedLocationId];
      locationRoles = _.compact(_.times(MAX_ROLES).map((index) => selectedLocation[`role${index + 1}`] && index + 1));
    }

    const availableRoles = [
      ..._.times(spyCount).map(() => SPY_ROLE),
      ..._.sampleSize(locationRoles, allPlayers.length - spyCount),
      ..._.times(allPlayers.length - locationRoles.length - spyCount, () => _.sample(locationRoles) || ''),
    ];

    let {newPlayersRoles, newSpies} = getPlayerRoles(allPlayers, availableRoles);
    // if the same spies, try again (keeping new results)
    if(_.isEqual(_.sortBy(newSpies), _.sortBy(spies))){
      const rolesResult = getPlayerRoles(allPlayers, availableRoles);
      newPlayersRoles = rolesResult.newPlayersRoles;
      newSpies = rolesResult.newSpies;
    }

    updateGame({
      state: newState,
      playersRoles: newPlayersRoles,
      location: selectedLocationId,
      prevLocation: location,
      spies: newSpies,
    });
  };

  const onEndGame = async () => {
    setShowResultPopup(true);

    updateGame({
      state: GAME_STATES.STOPPED,
      timerRunning: false,
    });
  };

  usePresence(`rooms/${roomId}`, roomConnected);

  return (
    <React.Fragment>
      <Row className={styles.container}>
        <Col>
          {!started &&
            <Button color={canStartGame ? 'primary' : 'secondary'} block disabled={!canStartGame} outline={!canStartGame} onClick={onStartGame}>
              <Localized name="interface.start_game" />
            </Button>
          }
          {started &&
            <Button color="danger" block onClick={onEndGame}>
              <Localized name="interface.end_game" />
            </Button>
          }
        </Col>
      </Row>
      <ResultPopup remotePlayers={room && room.remotePlayers} isOpen={showResultPopup} toggle={() => setShowResultPopup(false)} />
    </React.Fragment>
  );
};

const styles = {
  container: css({
    marginTop: 20,
  }),
};

const mapStateToProps = (state) => ({
  roomId: state.room.id,
  gameLocations: gameLocationsSelector(state),
  roomConnected: state.session.roomConnected,
  playersCount: state.config.players.length,
});

export default connect(mapStateToProps)(GameManager);
