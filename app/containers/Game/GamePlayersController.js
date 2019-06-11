import _ from 'lodash';
import React, {useMemo} from 'react';
import {css} from 'emotion';
import {connect} from 'react-redux';
import {Button, Col, Row} from 'reactstrap';
import Localized from 'components/Localized/Localized';
import {addPlayerAction, remPlayerAction} from 'actions/config';
import {MAX_PLAYERS} from 'consts';

export const GamePlayersController = ({room, playersCount, addPlayer, remPlayer}) => {
  const totalNumberOfPlayers = useMemo(() => playersCount + _.size(room?.remotePlayers), [playersCount, room]);
  const canAddPlayers = useMemo(() => totalNumberOfPlayers < MAX_PLAYERS, [totalNumberOfPlayers]);
  const canRemovePlayers = useMemo(() => totalNumberOfPlayers > 0 && playersCount > 0, [playersCount, totalNumberOfPlayers]);

  return (
    <Row className={styles.container}>
      <Col>
        <Button color={canAddPlayers ? 'primary' : 'secondary'} block onClick={() => addPlayer()} disabled={!canAddPlayers} outline={!canAddPlayers}>
          <Localized name="interface.add_player" />
        </Button>
      </Col>
      <Col>
        <Button color={canRemovePlayers ? 'danger' : 'secondary'} block onClick={() => remPlayer()} disabled={!canRemovePlayers} outline={!canRemovePlayers}>
          <Localized name="interface.rem_player" />
        </Button>
      </Col>
    </Row>
  );
};

const styles = {
  container: css({
    marginTop: 20,
  }),
};

const mapStateToProps = (state) => ({
  playersCount: state.config.players.length,
});

const mapDispatchToProps = (dispatch) => ({
  addPlayer: () => dispatch(addPlayerAction()),
  remPlayer: () => dispatch(remPlayerAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(GamePlayersController);
