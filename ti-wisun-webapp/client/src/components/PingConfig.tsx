import React, {useCallback, useEffect, useRef, useState} from 'react';
import Slider from './Slider';
import '../assets/PingConfig.css';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import CheckBox from './CheckBox';
import {ThemedInput} from './ThemedInput';
import {useContext} from 'react';
import {AutoPingburst, IPAddressInfo, NumberOfPacketsQuantity, Pingburst} from '../types';
import {APIService} from '../APIService';
import {ComponentThemeImplementations} from '../utils';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {PingJobsButton} from './PingJobsButton';
import Tooltip from './Tooltip';
import {
  InfoMessageTooltipCard,
  InfoPropertyTooltipCard,
  InfoTooltip,
  InfoTooltipMode,
} from './InfoTooltip';

interface NumberOfPacketsProps {
  numPackets: NumberOfPacketsQuantity;
  changeHandler: (newVal: NumberOfPacketsQuantity) => void;
}

interface PingConfigTheme {
  labelStyle: React.CSSProperties;
}
const pingConfigThemeImplementations = new ComponentThemeImplementations<PingConfigTheme>();
const tiPingConfigTheme = {
  labelStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
  },
};
pingConfigThemeImplementations.set(THEME.TI, tiPingConfigTheme);

const gruvboxPingConfigTheme = {
  labelStyle: {},
};
pingConfigThemeImplementations.set(THEME.GRUVBOX, gruvboxPingConfigTheme);
function NumberOfPackets(props: NumberOfPacketsProps) {
  const theme = useContext(ThemeContext);
  const [isInfinite, setIsInfinite] = useState(props.numPackets === '∞');
  const lastKnownFiniteNumPackets = useRef<NumberOfPacketsQuantity>(props.numPackets);
  let fontSize = isInfinite ? 20 : 14;

  useEffect(() => {
    setIsInfinite(props.numPackets === '∞');
  }, [props.numPackets]);

  const updateIsInfinite = (isInfiniteChecked: boolean) => {
    setIsInfinite(isInfiniteChecked);
    props.changeHandler(isInfiniteChecked ? '∞' : lastKnownFiniteNumPackets.current);
  };

  const onChangeHandler = (newText: string) => {
    if (isInfinite) {
      return;
    }
    const newVal = parseInt(newText, 10);
    lastKnownFiniteNumPackets.current = newVal;
    props.changeHandler(newVal);
  };

  return (
    <div className="num_packets_container">
      <div>
        <CheckBox
          className={'is_infinite_checkbox '.concat(theme)}
          isChecked={isInfinite}
          clickHandler={updateIsInfinite}
        />
      </div>
      <ThemedInput
        value={props.numPackets.toString(10)}
        style={{marginLeft: 10, width: '16%', fontSize}}
        onChange={onChangeHandler}
      />
    </div>
  );
}

interface PingConfigurationProps {
  ipAddressInfoArray: IPAddressInfo[];
  pingbursts: Pingburst[];
  autoPing: AutoPingburst;
}

export default function PingConfiguration(props: PingConfigurationProps) {
  const [packetSize, setPacketSize] = useState<number>(50);
  const [timeout, setTimeoutDuration] = useState<number>(1);
  const [interval, setIntervalDuration] = useState<number>(1);
  const [numPacketsRemaining, setNumPacketsRemaining] = useState<NumberOfPacketsQuantity>(10);
  const [prevNumPackets, setPrevNumPackets] =
    useState<NumberOfPacketsQuantity>(numPacketsRemaining);
  const [autoPing, setAutoPing] = useState(false);

  const theme = useContext(ThemeContext);

  const sendPingburst = useCallback(
    (destIP: string) => {
      APIService.postPingburst({
        destIP,
        packetSize,
        numPacketsRemaining,
        timeout,
        interval,
        autoPing,
      });
    },
    [packetSize, numPacketsRemaining, timeout, interval, autoPing]
  );
  const setIntervalClamped = useCallback(
    val => {
      if (timeout >= val) {
        setTimeoutDuration(val);
      }
      setIntervalDuration(val);
    },
    [setTimeoutDuration, setIntervalDuration, timeout]
  );
  const setTimeoutClamped = useCallback(
    val => {
      if (val >= interval) {
        setIntervalDuration(val);
      }
      setTimeoutDuration(val);
    },
    [setTimeoutDuration, setIntervalDuration, interval]
  );

  const clickHandler = useCallback(() => {
    const destinationIPs = [];
    for (let ipInfo of props.ipAddressInfoArray)
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    destinationIPs.forEach(ip => {
      sendPingburst(ip);
    });

    if (destinationIPs.length == 0) {
      sendPingburst('none');
    }
  }, [props.ipAddressInfoArray, sendPingburst]);

  const updateAutoPing = () => {
    // Turning off auto ping
    if (autoPing) {
      setNumPacketsRemaining(prevNumPackets);
    } else {
      setPrevNumPackets(numPacketsRemaining);
      setNumPacketsRemaining('∞');
    }

    setAutoPing(!autoPing);
  };

  const turnOffAutoPing = () => {
    APIService.cancelAutoPing();
  };

  let {labelStyle} = pingConfigThemeImplementations.get(theme);

  const createAutoPingInfoString = () => {
    const infos = [];
    infos.push(`Packet Size: ${props.autoPing.packetSize}B`);
    infos.push(`Timeout: ${props.autoPing.timeout}s`);
    infos.push(`Interval: ${props.autoPing.interval}s`);
    return infos;
  };

  return (
    <div className="ping_form_container">
      <div style={{position: 'relative', paddingTop: 15, marginLeft: 'auto'}}>
        <PingJobsButton
          style={{position: 'absolute', right: 10, top: 10}}
          ipAddressInfoArray={props.ipAddressInfoArray}
          pingbursts={props.pingbursts}
        />
      </div>

      <label style={labelStyle} className="ping_form_label">
        Packet Size [B]
      </label>
      <Slider min={0} step={25} max={1000} value={packetSize} changeHandler={setPacketSize} />
      <label style={labelStyle} className="ping_form_label">
        Timeout [s]
      </label>
      <Slider min={1} step={1} max={10} value={timeout} changeHandler={setTimeoutClamped} />
      <label style={labelStyle} className="ping_form_label">
        Interval [s]
      </label>
      <Slider min={1} step={1} max={10} value={interval} changeHandler={setIntervalClamped} />
      {!autoPing && (
        <label style={labelStyle} className="ping_form_label">
          Number of Packets
        </label>
      )}
      {!autoPing && (
        <div style={{marginTop: 5}}>
          <NumberOfPackets
            changeHandler={setNumPacketsRemaining}
            numPackets={numPacketsRemaining}
          />
        </div>
      )}

      <label style={labelStyle} className="ping_form_label">
        {`Ping All Nodes (+New)`}
      </label>
      <CheckBox isChecked={autoPing} clickHandler={updateAutoPing} />
      <ThemedButton
        style={{
          marginTop: 10,
          marginBottom: 5,
        }}
        themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        onClick={clickHandler}
      >
        Submit
      </ThemedButton>
      {props.autoPing.on && (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <div
              // className="ip-address-table-ip-address"
              style={{...labelStyle, fontStyle: 'italic'}}
              className="ping_form_label"
            >
              Auto Ping Is On
            </div>
            <InfoTooltip mode={InfoTooltipMode.INFO}>
              <InfoMessageTooltipCard
                name={'Auto Ping Info'}
                additionalDescriptions={createAutoPingInfoString()}
              />
            </InfoTooltip>
          </div>
          <div>
            <ThemedButton themedButtonType={THEMED_BUTTON_TYPE.SECONDARY} onClick={turnOffAutoPing}>
              Cancel
            </ThemedButton>
          </div>
        </>
      )}
      <div style={{height: 10}}></div>
    </div>
  );
}
