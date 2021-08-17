/**
 * @version 0.50
 * @author Vadym
 */

import React from 'react'
import {
    Text,
    View,
    StyleSheet
} from 'react-native'

import { useTheme } from '@app/theme/ThemeProvider'

const NftTokenInfo = (props) => {

    const {
        colors,
        GRID_SIZE
    } = useTheme()

    const {
        title,
        subTitle
    } = props

    return(
        <View style={{ flexDirection: 'row', marginBottom: GRID_SIZE }}>
            <View style={styles.contentContainer}>
                <Text numberOfLines={2} style={[styles.title, { color: colors.common.text1 }]}>{title}</Text>
                <Text style={styles.subTitle}>{subTitle}</Text>
            </View>
        </View>
    )
}

export default NftTokenInfo

const styles = StyleSheet.create({
    contentContainer: {
        marginTop: 16,
        marginRight: 16,
        marginLeft: 16
    },
    subTitle: {
        color: '#999999',
        fontFamily: 'SFUIDisplay-Bold',
        fontSize: 13,
        letterSpacing: 1.75,
        textTransform: 'uppercase'
    },
    title: {
        fontFamily: 'Montserrat-SemiBold',
        fontSize: 17
    }
})
