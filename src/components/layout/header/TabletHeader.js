import React from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components/macro';
import { HamburgerIcon, KaddexLightModeLogo, KaddexLogo } from '../../../assets';
import { useApplicationContext } from '../../../contexts';
import useWindowSize from '../../../hooks/useWindowSize';
import { ROUTE_INDEX } from '../../../router/routes';
import menuItems from '../../menuItems';
import HeaderItem from '../../shared/HeaderItem';
import GameEditionModeButton from './GameEditionModeButton';
import PopupContentList from './PopupContentList';
import RightHeaderItems from './RightHeaderItems';

const Container = styled.div`
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: start;
  min-height: ${({ theme: { header } }) => `${header.mobileHeight}px`};
  width: 100%;
  padding: 0 24px;
  padding-top: 16px;
`;

const LeftContainer = styled.div`
  display: flex;
  align-items: center;
  margin-right: 25px;
  & > *:not(:last-child) {
    margin-right: 25px;
  }
`;

const RightContainer = styled.div`
  display: flex;
`;

const RowContainer = styled.div`
  display: flex;
  flex-flow: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const TabletHeader = ({ className }) => {
  const history = useHistory();
  const { themeMode, resolutionConfiguration } = useApplicationContext();
  const [width, height] = useWindowSize();
  return (
    <Container className={className}>
      <RowContainer>
        <LeftContainer>
          <HeaderItem headerItemStyle={{ marginTop: '4px' }}>
            <PopupContentList withoutAccountInfo items={menuItems} icon={<HamburgerIcon />} className="hamburger" />
          </HeaderItem>
          {themeMode === 'dark' ? (
            <KaddexLogo style={{ cursor: 'pointer', zIndex: 1 }} onClick={() => history.push(ROUTE_INDEX)} />
          ) : (
            <KaddexLightModeLogo style={{ cursor: 'pointer', zIndex: 1 }} onClick={() => history.push(ROUTE_INDEX)} />
          )}
        </LeftContainer>

        {width >= resolutionConfiguration?.width && height >= resolutionConfiguration?.height && <GameEditionModeButton />}

        <RightContainer>
          <RightHeaderItems />
        </RightContainer>
      </RowContainer>
      <span className="mainnet-chain-2 desktop-none mobile-none">Mainnet Chain 2</span>
    </Container>
  );
};

export default TabletHeader;