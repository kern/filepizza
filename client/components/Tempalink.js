import React from 'react';

export default class Tempalink extends React.Component {

  render() {
    var url = window.location.origin + '/d/' + this.props.token;
    return <a href={url} className="tempalink">{url}</a>;
  }

}
