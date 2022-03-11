import axios from 'axios';
import moment from 'moment';

const BASE_URL = 'https://stage.swap.kaddex.com:5011';

const kaddexStatsRequest = async (url) => {
  try {
    return await axios
      .get(`${BASE_URL}/${url}`, {
        headers: { accept: 'application/json' },
      })
      .then(async (res) => {
        return res;
      })
      .catch((err) => console.log('stats error', err));
  } catch (error) {
    console.log('error', error);
  }
};

export const getDailyVolume = async () => {
  const url = `daily-volume?dateStart=${moment().subtract(2, 'day').format('YYYY-MM-DD')}&dateEnd=${moment()
    .subtract(1, 'day')
    .format('YYYY-MM-DD')}`;
  return await kaddexStatsRequest(url)
    .then((res) => {
      return res.data;
    })
    .catch((err) => console.log('err', err));
};