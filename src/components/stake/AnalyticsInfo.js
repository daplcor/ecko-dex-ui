import React from 'react';
import { Divider } from 'semantic-ui-react';
import { FlexContainer } from '../shared/FlexContainer';
import Label from '../shared/Label';

const AnalyticsInfo = () => {
  return (
    <FlexContainer className="column" gap={16}>
      <Label fontSize={16}>APR</Label>
      <Label>Annual Percentage Rate. It shows the estimated yearly interest generated by your tokens in the respective liquidity pool.</Label>
      <Divider />
      <Label fontSize={16}>Staked Share</Label>
      <Label>Your personal percentage share of KDX amongst all the KDX currently being staked.</Label>
      <Divider />
      <Label fontSize={16}>Daily Volume</Label>
      <Label>Its value refers to the overall DEX Volume.</Label>
      <Divider />
      <Label fontSize={16}>Total Staked</Label>
      <Label>Its value refers to the overall KDX being staked.</Label>
    </FlexContainer>
  );
};

export default AnalyticsInfo;
